import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendUserApprovedEmail } from "@/lib/nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Kullanıcı bilgilerini al
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Kullanıcıyı onayla
    const { error: updateError } = await supabase
      .from("users")
      .update({ 
        is_approved: true,
        approved_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Onay maili gönder
    try {
      await sendUserApprovedEmail(user.email, user.full_name);
      
      // Send system notification
      const { sendSystemNotification } = await import("@/lib/nodemailer");
      await sendSystemNotification("User Approved", `
        Member application has been approved:
        - Name: ${user.full_name}
        - Email: ${user.email}
        - Approved At: ${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
      `);
    } catch (mailError) {
      console.error("Approval email error:", mailError);
    }

    return NextResponse.json({ success: true, message: "User approved successfully" }, { status: 200 });
  } catch (error) {
    console.error("Approval process error:", error);
    return NextResponse.json({ error: "An error occurred during the approval process" }, { status: 500 });
  }
}
