import { NextResponse } from "next/server";

// Public self-registration is closed. New memberships are created exclusively
// by an admin via POST /api/admin/users.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Public registration is currently closed. Membership is by admin invitation only — please contact us at info@londonbridge.club.",
    },
    { status: 403 }
  );
}

export async function GET() {
  // Redirect accidental browser visits to the API back to the registration page
  return NextResponse.redirect(new URL("/register", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
