import { NextResponse } from "next/server";
import { AccountNotApprovedError, authCookie, login } from "@/lib/auth";
import { clearAuthRateLimit, consumeAuthRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      email.length > 320 ||
      password.length > 1024
    ) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const rateLimit = consumeAuthRateLimit("login", request, email, {
      windowMs: 15 * 60 * 1000,
      emailLimit: 5,
      ipLimit: 30,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rateLimit.retryAfter),
          },
        },
      );
    }

    const result = await login(email, password);
    if (!result) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password. If your account requires a security reset, use Forgot Password.",
        },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    clearAuthRateLimit("login", request, email);

    const response = NextResponse.json(
      { user: result.user },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(authCookie.name, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authCookie.maxAge,
      expires: result.expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof AccountNotApprovedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json(
      { error: "Unable to sign in" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
