import { User } from "../types/database";
import {
  loginWithLbc,
  registerWithLbc,
  validateLbcSessionToken,
} from "@/lib/lbc-auth";

export type AuthProvider = "lbc";

export function getAuthProvider(): AuthProvider {
  return "lbc";
}

// Kullanıcı kaydı
export async function register(
  email: string,
  password: string,
  fullName: string,
  status: "personal" | "corporate" = "personal",
  linkedinUrl?: string,
  profile?: Record<string, unknown>,
): Promise<User | null> {
  return registerWithLbc({
    email,
    password,
    fullName,
    status,
    linkedinUrl,
    profile,
  });
}

// Kullanıcı girişi
export async function login(
  email: string,
  password: string,
): Promise<{ user: User; token: string } | null> {
  return loginWithLbc(email, password);
}

// Token doğrulama
export async function validateToken(token: string): Promise<User | null> {
  return validateLbcSessionToken(token);
}

// Çıkış yap
export async function logout(_token: string): Promise<boolean> {
  return true;
}

// Validate session from request headers — returns full User object (includes is_admin)
export async function validateSession(request: Request): Promise<User | null> {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    return validateToken(token);
  } catch (error) {
    console.error("validateSession - Error:", error);
    return null;
  }
}
