import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { sendSystemNotification } from "@/lib/nodemailer";

export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session || (session.role !== "admin" && !session.is_admin)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { action, details } = await request.json();

    if (!action || !details) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await sendSystemNotification(action, details);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("System notification API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
