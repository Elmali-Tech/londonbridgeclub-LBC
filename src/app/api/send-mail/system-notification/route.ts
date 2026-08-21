import { NextResponse } from "next/server";
import { sendSystemNotification } from "@/lib/nodemailer";
import { requireAdmin } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

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
