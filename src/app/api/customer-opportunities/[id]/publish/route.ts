import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { requireRole } from "@/lib/permissions";

const normalizeStage = (stage?: string | null) => {
  if (!stage) return "Lead";
  if (stage === "Prospect") return "Lead";
  if (stage === "Qualified") return "Qualified";
  if (stage === "Opportunity") return "Qualified";
  return stage;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(request, ["admin", "opportunity_manager"]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const customerOpportunityId = Number(id);
    if (!Number.isInteger(customerOpportunityId)) {
      return NextResponse.json(
        { success: false, error: "Invalid customer opportunity ID" },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const { data: customerOpportunity, error: customerError } = await supabase
      .from("customer_opportunities")
      .select("*")
      .eq("id", customerOpportunityId)
      .single();

    if (customerError || !customerOpportunity) {
      return NextResponse.json(
        { success: false, error: "Customer opportunity not found" },
        { status: 404 },
      );
    }

    const publicOpportunity = {
      title: customerOpportunity.opportunity_title,
      company: customerOpportunity.company_name,
      service_detail: normalizeStage(customerOpportunity.deal_stage),
      category: "Member Opportunity",
      estimated_budget:
        customerOpportunity.estimated_deal_size || "To be discussed",
      description:
        customerOpportunity.opportunity_description ||
        `Member-facing opportunity for ${customerOpportunity.company_name}.`,
      is_active: true,
      customer_opportunity_id: customerOpportunityId,
    };

    const { data: existingOpportunity, error: existingError } = await supabase
      .from("opportunities")
      .select("id")
      .eq("customer_opportunity_id", customerOpportunityId)
      .maybeSingle();

    if (existingError) {
      console.error("Published opportunity lookup error:", existingError);
      return NextResponse.json(
        { success: false, error: "Failed to inspect published opportunity" },
        { status: 500 },
      );
    }

    const mutation = existingOpportunity
      ? supabase
          .from("opportunities")
          .update(publicOpportunity)
          .eq("id", existingOpportunity.id)
          .select()
      : supabase
          .from("opportunities")
          .insert([
            {
              ...publicOpportunity,
              created_at: new Date().toISOString(),
            },
          ])
          .select();

    const { data, error } = await mutation;
    if (error || !data?.[0]) {
      console.error("Publish opportunity error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to publish opportunity" },
        { status: 500 },
      );
    }

    try {
      const { sendSystemNotification } = await import("@/lib/nodemailer");
      await sendSystemNotification(
        "Opportunity Published to Members",
        `
        A CRM customer pool record has been published to member opportunities:
        - CRM ID: ${customerOpportunityId}
        - Company: ${customerOpportunity.company_name}
        - Opportunity: ${customerOpportunity.opportunity_title}
        - Published Opportunity ID: ${data[0].id}
      `,
      );
    } catch (notifyError) {
      console.error("Notification Error:", notifyError);
    }

    return NextResponse.json({
      success: true,
      opportunity: data[0],
      mode: existingOpportunity ? "updated" : "created",
    });
  } catch (error) {
    console.error("Publish customer opportunity API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
