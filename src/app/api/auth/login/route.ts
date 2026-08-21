import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import {
  getLbcAuthReadiness,
  LbcAuthConfigurationError,
} from "@/lib/lbc-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    const readiness = getLbcAuthReadiness();
    if (!readiness.canValidateCredentials || !readiness.canIssueSessions) {
      return NextResponse.json(
        {
          success: false,
          error: "LBC auth is not ready for login.",
          code: "LBC_AUTH_NOT_READY",
          readiness,
        },
        { status: 503 },
      );
    }

    const result = await login(email, password);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    if (error instanceof LbcAuthConfigurationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "LBC_AUTH_NOT_READY",
          readiness: getLbcAuthReadiness(),
        },
        { status: 503 },
      );
    }

    console.error("Auth login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 },
    );
  }
}
