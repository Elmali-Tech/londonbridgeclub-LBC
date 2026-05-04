import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const { data: opportunities, error } = await supabase
      .from("customer_opportunities")
      .select(
        `
        *,
        created_by_user:users!customer_opportunities_created_by_fkey (
          full_name,
          email
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch opportunities error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch opportunities" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, opportunities });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createClient();

    // Check if user has permission to create
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
        {
          success: false,
          error:
            "Forbidden: You do not have permission to create opportunities",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      customer_name,
      company_name,
      contact_person,
      opportunity_title,
      opportunity_description,
      estimated_deal_size,
      deal_stage,
      responsible_person,
      expected_closing_date,
      status,
    } = body;

    if (!customer_name || !company_name || !opportunity_title) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Clean data: empty strings to null for date fields
    const formattedDate =
      expected_closing_date && expected_closing_date.trim() !== ""
        ? expected_closing_date
        : null;

    const { data, error } = await supabase
      .from("customer_opportunities")
      .insert([
        {
          customer_name,
          company_name,
          contact_person: contact_person || null,
          opportunity_title,
          opportunity_description: opportunity_description || null,
          estimated_deal_size: estimated_deal_size || null,
          deal_stage: deal_stage || "Prospect",
          responsible_person: responsible_person || null,
          expected_closing_date: formattedDate,
          status: status || "Active",
          created_by: session.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Create opportunity error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create opportunity" },
        { status: 500 },
      );
    }

    // Send email notification
    try {
      const { sendSystemNotification } = await import("@/lib/nodemailer");
      await sendSystemNotification("New Opportunity Created", `
        A new prospect has been added to the Customer Pool:
        - Client: ${customer_name}
        - Company: ${company_name}
        - Opportunity: ${opportunity_title}
        - Estimated Size: ${estimated_deal_size || 'N/A'}
        - Stage: ${deal_stage}
        - Responsible: ${responsible_person || 'Unassigned'}
      `);
    } catch (notifyError) {
      console.error("Notification Error:", notifyError);
    }

    return NextResponse.json({ success: true, opportunity: data[0] });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
