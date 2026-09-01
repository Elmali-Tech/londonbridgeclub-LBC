import { NextResponse } from "next/server";
import { authCookie, validateSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await validateSession(request);
  const response = NextResponse.json(
    { user },
    {
      status: user ? 200 : 401,
      headers: { "Cache-Control": "no-store" },
    },
  );

  if (!user) {
    response.cookies.set(authCookie.name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}
