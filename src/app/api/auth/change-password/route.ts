import { NextResponse } from "next/server";
import {
  authCookie,
  hashPassword,
  invalidateUserSessions,
  MIN_PASSWORD_LENGTH,
  validateSession,
  verifyPassword,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await validateSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (
      !currentPassword ||
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > 1024
    ) {
      return NextResponse.json(
        {
          error: `Current password and a new password of at least ${MIN_PASSWORD_LENGTH} characters are required`,
        },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) throw userError;
    if (!userRow?.password_hash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const verification = await verifyPassword(currentPassword, userRow.password_hash);
    if (!verification.valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) throw updateError;
    await invalidateUserSessions(user.id);

    const response = NextResponse.json(
      { success: true, signedOut: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(authCookie.name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/change-password failed", error);
    return NextResponse.json({ error: "Unable to change password" }, { status: 500 });
  }
}
