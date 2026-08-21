import { createHash, createHmac, timingSafeEqual } from "crypto";
import {
  callLbcEndpoint,
  getLbcRows,
  LbcEndpoint,
  LbcListResponse,
  LbcMember,
} from "@/lib/lbc-api";
import { mapLbcTypeToStatus, normalizeMemberEmail } from "@/lib/lbc-members";
import { User, UserRole } from "@/types/database";

type LbcSessionPayload = {
  provider: "lbc";
  memberId: string;
  email: string;
  exp: number;
};

type LbcLoginResult = {
  user: User;
  token: string;
};

export type LbcAuthReadiness = {
  provider: "lbc";
  enabled: boolean;
  readyForCutover: boolean;
  canIssueSessions: boolean;
  canValidateCredentials: boolean;
  canRegisterMembers: boolean;
  sessionSecretSource: string | null;
  endpoints: {
    login: string | null;
    register: string;
    requestPasswordReset: string | null;
    resetPassword: string | null;
    changePassword: string | null;
  };
  missing: string[];
  warnings: string[];
  nextActions: string[];
};

export class LbcAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LbcAuthConfigurationError";
  }
}

type LbcRegisterInput = {
  email: string;
  password: string;
  fullName: string;
  status: "personal" | "corporate";
  linkedinUrl?: string;
  profile?: Record<string, unknown>;
};

const LBC_USER_ID_BASE = 1_000_000_000;
const LBC_USER_ID_RANGE = 900_000_000;
const REPOSITORY_ADMIN_EMAILS = ["laavanjanlaa@gmail.com"];

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecretSource() {
  if (process.env.LBC_AUTH_SESSION_SECRET) return "LBC_AUTH_SESSION_SECRET";
  if (process.env.RESET_PASSWORD_SECRET) return "RESET_PASSWORD_SECRET";
  if (process.env.NEXTAUTH_SECRET) return "NEXTAUTH_SECRET";
  if (process.env.LBC_API_TOKEN) return "LBC_API_TOKEN";
  return null;
}

function getSessionSecret() {
  return (
    process.env.LBC_AUTH_SESSION_SECRET ||
    process.env.RESET_PASSWORD_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.LBC_API_TOKEN ||
    ""
  );
}

function normalizeConfiguredPath(value: string | undefined | null) {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return (trimmed.startsWith("/") ? trimmed : `/${trimmed}`) as LbcEndpoint;
}

export function getLbcAuthReadiness(): LbcAuthReadiness {
  const provider = "lbc" as const;
  const sessionSecretSource = getSessionSecretSource();
  const loginPath = normalizeConfiguredPath(process.env.LBC_AUTH_LOGIN_PATH);
  const registerPath =
    normalizeConfiguredPath(process.env.LBC_AUTH_REGISTER_PATH) || "/members";
  const requestPasswordResetPath = normalizeConfiguredPath(
    process.env.LBC_AUTH_REQUEST_PASSWORD_RESET_PATH,
  );
  const resetPasswordPath = normalizeConfiguredPath(
    process.env.LBC_AUTH_RESET_PASSWORD_PATH,
  );
  const changePasswordPath = normalizeConfiguredPath(
    process.env.LBC_AUTH_CHANGE_PASSWORD_PATH,
  );
  const hasApiToken = Boolean(process.env.LBC_API_TOKEN);
  const hasExplicitSessionSecret = Boolean(process.env.LBC_AUTH_SESSION_SECRET);
  const missing: string[] = [];
  const warnings: string[] = [];
  const nextActions: string[] = [];

  if (!hasApiToken) {
    missing.push("LBC_API_TOKEN");
    nextActions.push("Vercel Production env'e LBC_API_TOKEN ekle.");
  }

  if (!loginPath) {
    missing.push("LBC_AUTH_LOGIN_PATH");
    nextActions.push("LBC API credential validation endpoint'i gelince LBC_AUTH_LOGIN_PATH ayarla.");
  }

  if (!sessionSecretSource) {
    missing.push("LBC_AUTH_SESSION_SECRET");
    nextActions.push("lbc_sess token imzası için LBC_AUTH_SESSION_SECRET üret.");
  } else if (!hasExplicitSessionSecret) {
    warnings.push(
      `Session signing currently falls back to ${sessionSecretSource}; cutover before explicit LBC_AUTH_SESSION_SECRET is not recommended.`,
    );
    nextActions.push("Production'a ayrı bir LBC_AUTH_SESSION_SECRET ekle.");
  }

  if (!loginPath) {
    warnings.push("Login endpoint'i yoksa kullanıcı girişi kapalı kalır.");
  }

  if (!requestPasswordResetPath || !resetPasswordPath) {
    warnings.push("Password reset LBC API endpoint'leri henüz yapılandırılmamış.");
  }

  const canIssueSessions = Boolean(sessionSecretSource);
  const canValidateCredentials = hasApiToken && Boolean(loginPath);
  const canRegisterMembers = hasApiToken && Boolean(registerPath);
  const readyForCutover = hasApiToken && hasExplicitSessionSecret && Boolean(loginPath);

  if (readyForCutover) {
    nextActions.push("Staging/preview ortamında login/logout/session E2E testi çalıştır.");
  }

  return {
    provider,
    enabled: provider === "lbc",
    readyForCutover,
    canIssueSessions,
    canValidateCredentials,
    canRegisterMembers,
    sessionSecretSource,
    endpoints: {
      login: loginPath,
      register: registerPath,
      requestPasswordReset: requestPasswordResetPath,
      resetPassword: resetPasswordPath,
      changePassword: changePasswordPath,
    },
    missing,
    warnings,
    nextActions,
  };
}

function signPayload(payload: LbcSessionPayload) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("LBC auth session secret is not configured.");
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `lbc_sess_${encodedPayload}.${signature}`;
}

function verifyPayload(token: string): LbcSessionPayload | null {
  const secret = getSessionSecret();
  if (!secret || !token.startsWith("lbc_sess_")) return null;

  const rawToken = token.replace(/^lbc_sess_/, "");
  const [encodedPayload, receivedSignature] = rawToken.split(".");
  if (!encodedPayload || !receivedSignature) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as LbcSessionPayload;
    if (payload.provider !== "lbc" || !payload.memberId || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function stableNumericId(value: string) {
  const digest = createHash("sha256").update(value).digest();
  return LBC_USER_ID_BASE + (digest.readUInt32BE(0) % LBC_USER_ID_RANGE);
}

export function getLbcStableUserId(value: string) {
  return stableNumericId(value);
}

function normalizeRole(member: LbcMember): UserRole {
  const adminEmails = new Set([
    ...REPOSITORY_ADMIN_EMAILS.map((email) => normalizeMemberEmail(email)),
    ...(process.env.LBC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => normalizeMemberEmail(email))
      .filter(Boolean),
  ]);

  return adminEmails.has(normalizeMemberEmail(member.email)) ? "admin" : "viewer";
}

function isActiveSubscription(member: LbcMember) {
  const status = String(member.active_subscription?.status || "").toLocaleLowerCase("tr-TR");
  return ["active", "aktif", "trialing"].some((value) => status.includes(value));
}

function getBridgeEmail(member: LbcMember) {
  return normalizeMemberEmail(member.email) || `lbc+${member.id}@members.londonbridge.invalid`;
}

export function mapLbcMemberToAuthUser(member: LbcMember): User {
  const role = normalizeRole(member);
  const fullName =
    member.name ||
    member.representative_name ||
    normalizeMemberEmail(member.email).split("@")[0] ||
    member.member_id ||
    "LBC Member";

  return {
    id: stableNumericId(member.id),
    email: getBridgeEmail(member),
    password_hash: "",
    full_name: fullName,
    headline: member.title || member.type || undefined,
    bio: member.about || undefined,
    location: "London, United Kingdom",
    industry: member.sector || member.category || undefined,
    status: mapLbcTypeToStatus(member.type),
    linkedin_url: undefined,
    website_url: undefined,
    created_at: member.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stripe_customer_id: member.active_subscription?.processor_customer_id || undefined,
    subscription_status: isActiveSubscription(member) ? "active" : "inactive",
    is_approved: true,
    is_admin: role === "admin",
    role,
    can_create_opportunities: role === "admin" || role === "opportunity_manager",
    lbc_record_id: member.id,
    lbc_member_id: member.member_id || null,
    lbc_member_type: member.type || null,
    lbc_tier: member.tier || member.active_subscription?.tier || null,
    lbc_sector: member.sector || null,
    lbc_is_anchor: member.is_anchor ?? null,
    lbc_member_payload: member as unknown as Record<string, unknown>,
    lbc_synced_at: new Date().toISOString(),
    auth_provider: "lbc",
    password_needs_reset: false,
  };
}

export async function ensureLbcUserBridge(member: LbcMember): Promise<User> {
  return mapLbcMemberToAuthUser(member);
}

function extractMemberFromPayload(payload: unknown): LbcMember | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const data = record.data;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const dataRecord = data as Record<string, unknown>;
    const nestedMember = dataRecord.member || dataRecord.user || dataRecord.data;
    if (nestedMember && typeof nestedMember === "object" && !Array.isArray(nestedMember)) {
      return nestedMember as LbcMember;
    }
    if (typeof dataRecord.id === "string") return dataRecord as LbcMember;
  }

  if (typeof record.id === "string") return record as LbcMember;
  return null;
}

export async function findLbcMemberByEmail(email: string) {
  const normalizedEmail = normalizeMemberEmail(email);
  if (!normalizedEmail) return null;

  return (
    (await getLbcMembers()).find(
      (member) => normalizeMemberEmail(member.email) === normalizedEmail,
    ) || null
  );
}

export async function getLbcMembers() {
  const result = await callLbcEndpoint<LbcListResponse<LbcMember>>("/members");
  if (!result.success) return [];

  return getLbcRows<LbcMember>(result.data);
}

function normalizeRouteMemberId(memberId: string) {
  return decodeURIComponent(memberId).replace(/^lbc:/, "").trim();
}

export async function getLbcMemberById(memberId: string) {
  const normalizedMemberId = normalizeRouteMemberId(memberId);
  const detailResult = await callLbcEndpoint<{ data?: LbcMember } | LbcMember>(
    `/members/${encodeURIComponent(normalizedMemberId)}` as LbcEndpoint,
  );

  if (detailResult.success) {
    const member = extractMemberFromPayload(detailResult.data);
    if (member) return member;
  }

  return (
    (await getLbcMembers()).find(
      (member) => member.id === normalizedMemberId || member.member_id === normalizedMemberId,
    ) || null
  );
}

export async function findLbcMemberByRouteId(routeId: string) {
  const normalizedRouteId = normalizeRouteMemberId(routeId);
  const directMember = await getLbcMemberById(normalizedRouteId);
  if (directMember) return directMember;

  const numericRouteId = Number(normalizedRouteId);
  if (!Number.isFinite(numericRouteId)) return null;

  return (
    (await getLbcMembers()).find((member) => {
      return (
        stableNumericId(member.id) === numericRouteId ||
        (member.member_id ? stableNumericId(member.member_id) === numericRouteId : false)
      );
    }) || null
  );
}

async function createLbcSession(member: LbcMember): Promise<LbcLoginResult> {
  const user = await ensureLbcUserBridge(member);
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

  return {
    user,
    token: signPayload({
      provider: "lbc",
      memberId: member.id,
      email: user.email,
      exp: expiresAt,
    }),
  };
}

export async function loginWithLbc(
  email: string,
  password: string,
): Promise<LbcLoginResult | null> {
  const readiness = getLbcAuthReadiness();
  const loginPath = readiness.endpoints.login as LbcEndpoint | null;

  if (!loginPath) {
    throw new LbcAuthConfigurationError(
      "LBC auth login endpoint is not configured. Set LBC_AUTH_LOGIN_PATH after the API exposes credential validation.",
    );
  }

  const result = await callLbcEndpoint(loginPath, {
    logicalMethod: "POST",
    payload: {
      email: normalizeMemberEmail(email),
      password,
    },
  });

  if (!result.success) return null;

  const member = extractMemberFromPayload(result.data);
  return member ? createLbcSession(member) : null;
}

function extractExistingMemberId(result: { data?: unknown; bodyError?: Record<string, unknown> }) {
  const bodyError = result.bodyError || {};
  if (typeof bodyError.existing_member_id === "string") return bodyError.existing_member_id;

  const details = bodyError.details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const existingId = (details as Record<string, unknown>).existing_member_id;
    if (typeof existingId === "string") return existingId;
  }

  if (result.data && typeof result.data === "object" && !Array.isArray(result.data)) {
    const record = result.data as Record<string, unknown>;
    if (typeof record.existing_member_id === "string") return record.existing_member_id;

    const error = record.error;
    if (error && typeof error === "object" && !Array.isArray(error)) {
      const existingId = (error as Record<string, unknown>).existing_member_id;
      if (typeof existingId === "string") return existingId;
    }
  }

  return null;
}

export async function registerWithLbc(input: LbcRegisterInput): Promise<User | null> {
  const registerPath = (process.env.LBC_AUTH_REGISTER_PATH || "/members") as LbcEndpoint;
  const payload: Record<string, unknown> = {
    email: normalizeMemberEmail(input.email),
    name: input.fullName,
    full_name: input.fullName,
    type: input.status === "corporate" ? "Kurumsal" : "Bireysel HNW",
    linkedin_url: input.linkedinUrl || null,
    source: "lbc-web",
    ...(input.profile || {}),
  };

  if (process.env.LBC_AUTH_SEND_PASSWORD_HASH === "true") {
    payload.password_hash = createHash("sha256").update(input.password).digest("hex");
  }

  if (process.env.LBC_AUTH_SEND_PASSWORD === "true") {
    payload.password = input.password;
  }

  const result = await callLbcEndpoint(registerPath, {
    logicalMethod: "POST",
    payload,
    idempotencyKey: `member:${payload.email}`,
  });

  if (!result.success) {
    if (result.bodyError?.code === "EMAIL_ALREADY_EXISTS") {
      const existingId = extractExistingMemberId(result);
      if (existingId) {
        const member = await getLbcMemberById(existingId);
        return member ? ensureLbcUserBridge(member) : null;
      }
    }
    return null;
  }

  const createdMember =
    extractMemberFromPayload(result.data) || (await findLbcMemberByEmail(input.email));
  return createdMember ? ensureLbcUserBridge(createdMember) : null;
}

export async function validateLbcSessionToken(token: string): Promise<User | null> {
  const payload = verifyPayload(token);
  if (!payload) return null;

  const member = await getLbcMemberById(payload.memberId);
  if (!member) return null;

  const user = await ensureLbcUserBridge(member);
  return normalizeMemberEmail(user.email) === normalizeMemberEmail(payload.email) ? user : null;
}

export function isLbcSessionToken(token: string) {
  return token.startsWith("lbc_sess_");
}
