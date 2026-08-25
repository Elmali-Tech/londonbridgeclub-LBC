import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "crypto";
import type { User } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

const SESSION_COOKIE_NAME = "authToken";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

const SCRYPT_PREFIX = "scrypt";
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 12;
const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$bGJjLWF1dGgtZHVtbXktc2FsdC0yMDI2$NncEVrIUKQ5xwlrRuJGtH_F9UGY6-n8p3OcI6ODsKLnm5C1i5ZQa38XW1mNHzXEhGmNGlcCD3NU-IH6zG_gIqQ";

export const SAFE_USER_SELECT = [
  "id",
  "email",
  "full_name",
  "username",
  "headline",
  "bio",
  "profile_image_key",
  "banner_image_key",
  "location",
  "industry",
  "status",
  "linkedin_url",
  "website_url",
  "date_of_birth",
  "created_at",
  "updated_at",
  "stripe_customer_id",
  "subscription_status",
  "is_approved",
  "approved_at",
  "is_admin",
  "role",
  "can_create_opportunities",
  "can_publish",
].join(",");

type UserRow = User & { password_hash: string };

export class AccountNotApprovedError extends Error {
  constructor() {
    super("Your account is currently pending approval. You will receive an email once it's approved.");
    this.name = "AccountNotApprovedError";
  }
}

function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error("Authentication services are server-only");
  }
}

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sanitizeUser(row: UserRow | Record<string, unknown>): User {
  const { password_hash: _passwordHash, ...user } = row;
  return user as unknown as User;
}

export async function hashPassword(password: string): Promise<string> {
  assertServerRuntime();

  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });

  return [
    SCRYPT_PREFIX,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  assertServerRuntime();

  if (LEGACY_SHA256_PATTERN.test(storedHash)) {
    // Legacy SHA-256 digests were publicly readable before the RLS cutover and
    // must therefore be treated as compromised. Do the legacy comparison and
    // a full scrypt derivation to avoid a cheap account-format timing signal,
    // but never authenticate or upgrade from the supplied password. Recovery
    // must go through the password-reset flow, which writes a fresh scrypt hash.
    const supplied = createHash("sha256").update(password).digest();
    const expected = Buffer.from(storedHash, "hex");
    safeEqual(supplied, expected);
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return { valid: false, needsUpgrade: false };
  }

  const [prefix, costValue, blockSizeValue, parallelizationValue, saltValue, hashValue] =
    storedHash.split("$");

  if (
    prefix !== SCRYPT_PREFIX ||
    !costValue ||
    !blockSizeValue ||
    !parallelizationValue ||
    !saltValue ||
    !hashValue
  ) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return { valid: false, needsUpgrade: false };
  }

  const cost = Number(costValue);
  const blockSize = Number(blockSizeValue);
  const parallelization = Number(parallelizationValue);

  if (
    !Number.isSafeInteger(cost) ||
    !Number.isSafeInteger(blockSize) ||
    !Number.isSafeInteger(parallelization) ||
    cost < 2 ||
    cost > 65_536 ||
    (cost & (cost - 1)) !== 0 ||
    blockSize < 1 ||
    blockSize > 16 ||
    parallelization < 1 ||
    parallelization > 4
  ) {
    return { valid: false, needsUpgrade: false };
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    if (salt.length < 16 || salt.length > 64 || expected.length < 32 || expected.length > 128) {
      return { valid: false, needsUpgrade: false };
    }
    const supplied = await scrypt(password, salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: 64 * 1024 * 1024,
    });

    return {
      valid: safeEqual(supplied, expected),
      needsUpgrade:
        cost !== SCRYPT_COST ||
        blockSize !== SCRYPT_BLOCK_SIZE ||
        parallelization !== SCRYPT_PARALLELIZATION ||
        expected.length !== SCRYPT_KEY_LENGTH,
    };
  } catch {
    return { valid: false, needsUpgrade: false };
  }
}

export function generateToken(): string {
  assertServerRuntime();
  return randomBytes(32).toString("hex");
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  status: "personal" | "corporate" = "personal",
  linkedinUrl?: string,
): Promise<User | null> {
  assertServerRuntime();
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 1024) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const supabase = createClient();
  const normalizedEmail = normalizeEmail(email);

  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingUser) throw new Error("Email already exists");

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("users")
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: fullName,
      status,
      linkedin_url: linkedinUrl || null,
      created_at: now,
      updated_at: now,
    })
    .select(SAFE_USER_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as User;
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: User; token: string; expiresAt: Date } | null> {
  assertServerRuntime();
  const supabase = createClient();
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  if (!data?.password_hash) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const passwordResult = await verifyPassword(password, data.password_hash);
  if (!passwordResult.valid) return null;

  const isEffectiveAdmin = data.is_admin === true || data.role === "admin";
  if (data.is_approved !== true && !isEffectiveAdmin) {
    throw new AccountNotApprovedError();
  }

  if (passwordResult.needsUpgrade) {
    const upgradedHash = await hashPassword(password);
    const { error: upgradeError } = await supabase
      .from("users")
      .update({
        password_hash: upgradedHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("password_hash", data.password_hash);

    if (upgradeError) throw upgradeError;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const { error: sessionError } = await supabase.from("sessions").insert({
    user_id: data.id,
    token: hashSessionToken(token),
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  });

  if (sessionError) throw sessionError;

  return { user: sanitizeUser(data as UserRow), token, expiresAt };
}

export async function validateToken(token: string): Promise<User | null> {
  assertServerRuntime();
  if (!SESSION_TOKEN_PATTERN.test(token)) return null;

  const supabase = createClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("token", hashSessionToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError || !session) return null;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select(SAFE_USER_SELECT)
    .eq("id", session.user_id)
    .maybeSingle();

  if (userError || !user) return null;
  const safeUser = user as unknown as User;
  const isEffectiveAdmin = safeUser.is_admin === true || safeUser.role === "admin";
  if (safeUser.is_approved !== true && !isEffectiveAdmin) return null;
  return safeUser;
}

export async function logout(token: string): Promise<boolean> {
  assertServerRuntime();
  if (!SESSION_TOKEN_PATTERN.test(token)) return true;

  const supabase = createClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("token", hashSessionToken(token));

  if (error) throw error;
  return true;
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = item.trim().split("=");
    if (rawName !== name) continue;

    const rawValue = rawValueParts.join("=");
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function getTokenFromRequest(request: Request): string | null {
  const cookieToken = readCookie(request, SESSION_COOKIE_NAME);
  if (cookieToken && SESSION_TOKEN_PATTERN.test(cookieToken)) return cookieToken;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const bearerToken = authorization.slice(7).trim();
  return SESSION_TOKEN_PATTERN.test(bearerToken) ? bearerToken : null;
}

export async function validateSession(request: Request): Promise<User | null> {
  const token = getTokenFromRequest(request);
  return token ? validateToken(token) : null;
}

export async function invalidateUserSessions(userId: number): Promise<void> {
  assertServerRuntime();
  const supabase = createClient();
  const { error } = await supabase.from("sessions").delete().eq("user_id", userId);
  if (error) throw error;
}

export const authCookie = {
  name: SESSION_COOKIE_NAME,
  maxAge: Math.floor(SESSION_DURATION_MS / 1000),
};
