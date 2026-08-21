import { NextResponse } from "next/server";
import { callLbcEndpoint, LbcEndpoint } from "@/lib/lbc-api";
import { getLbcAuthReadiness } from "@/lib/lbc-auth";

type Body = {
  token?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const token = (body?.token || "").toString();
    const newPassword = (body?.password || "").toString();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token ve şifre gereklidir" },
        { status: 400 },
      );
    }

    const readiness = getLbcAuthReadiness();
    const resetPasswordPath = readiness.endpoints.resetPassword;
    if (!resetPasswordPath) {
      return NextResponse.json(
        {
          error: "LBC password reset endpoint is not configured.",
          code: "LBC_AUTH_NOT_READY",
          readiness,
        },
        { status: 503 },
      );
    }

    const result = await callLbcEndpoint(resetPasswordPath as LbcEndpoint, {
      logicalMethod: "POST",
      payload: { token, password: newPassword },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Password reset failed",
          code: result.bodyError?.code || "LBC_PASSWORD_RESET_FAILED",
          bodyError: result.bodyError,
        },
        { status: result.status === 200 ? 502 : result.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu" },
      { status: 500 },
    );
  }
}
