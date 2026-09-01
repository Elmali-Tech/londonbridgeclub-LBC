import { NextResponse } from "next/server";
import { authCookie, getTokenFromRequest, logout } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (token) await logout(token);
  } catch (error) {
    console.error("POST /api/auth/logout failed", error);
  }

  const response = NextResponse.json(
    { success: true },
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
}
