import { NextResponse } from "next/server";
import { callLbcEndpoint, LbcEndpoint } from "@/lib/lbc-api";
import { getLbcAuthReadiness } from "@/lib/lbc-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const readiness = getLbcAuthReadiness();
    const resetRequestPath = readiness.endpoints.requestPasswordReset;
    if (!resetRequestPath) {
      return NextResponse.json(
        {
          error: "LBC password reset request endpoint is not configured.",
          code: "LBC_AUTH_NOT_READY",
          readiness,
        },
        { status: 503 },
      );
    }

    const result = await callLbcEndpoint(resetRequestPath as LbcEndpoint, {
      logicalMethod: "POST",
      payload: { email },
      idempotencyKey: `password-reset:${email}`,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Password reset request failed",
          code: result.bodyError?.code || "LBC_PASSWORD_RESET_FAILED",
          bodyError: result.bodyError,
        },
        { status: result.status === 200 ? 502 : result.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
