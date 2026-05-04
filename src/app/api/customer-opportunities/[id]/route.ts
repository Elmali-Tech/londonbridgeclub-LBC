import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createClient();

    // Check permission
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.id)
      .single();

    if (
      userError ||
      !user ||
      (user.role !== "admin" && user.role !== "opportunity_manager")
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { id } = await params;

    // Clean data: empty strings to null for date fields
    if (body.expected_closing_date === "") {
      body.expected_closing_date = null;
    }

    const { data, error } = await supabase
      .from("customer_opportunities")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Update opportunity error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update" },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Update failed: No record found or invisible",
        },
        { status: 404 },
      );
    }

    // Send email notification
    try {
      const { sendSystemNotification } = await import("@/lib/nodemailer");
      await sendSystemNotification("Opportunity Updated", `
        An opportunity has been modified in the Customer Pool:
        - ID: ${id}
        - Client: ${data[0].customer_name}
        - Company: ${data[0].company_name}
        - Title: ${data[0].opportunity_title}
        - New Stage: ${data[0].deal_stage}
        - New Status: ${data[0].status}
      `);
    } catch (notifyError) {
      console.error("Notification Error:", notifyError);
    }

    return NextResponse.json({ success: true, opportunity: data[0] });
  } catch (error) {
    console.error("API Error (PUT):", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createClient();

    // Check permission
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.id)
      .single();

    if (userError || !user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admins can delete" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const { error } = await supabase
      .from("customer_opportunities")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete opportunity error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete" },
        { status: 500 },
      );
    }

    // Send email notification
    try {
      const { sendSystemNotification } = await import("@/lib/nodemailer");
      await sendSystemNotification("Opportunity Deleted", `
        An opportunity has been removed from the Customer Pool:
        - Opportunity ID: ${id}
        - Deleted By: ${session.id}
      `);
    } catch (notifyError) {
      console.error("Notification Error:", notifyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error (DELETE):", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
