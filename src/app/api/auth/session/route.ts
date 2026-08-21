import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await validateSession(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Auth session error:", error);
    return NextResponse.json(
      { success: false, error: "Session validation failed" },
      { status: 500 },
    );
  }
}
