import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateSession } from "@/lib/auth";

type InterestLookupResult = {
  id: number;
  customer_opportunity_id: number | null;
  status: string | null;
};

type RecordInterestResult = {
  id: number;
  inserted: boolean;
  customer_opportunity_id: number | null;
};

export async function GET(
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

    const resolvedParams = await params;
    const opportunityId = parseInt(resolvedParams.id);

    if (isNaN(opportunityId)) {
      return NextResponse.json(
        { success: false, error: "Invalid opportunity ID" },
        { status: 400 },
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "get_opportunity_interest_for_user",
      {
        p_user_id: session.id,
        p_opportunity_id: opportunityId,
      },
    );

    if (error) {
      console.error("Error fetching interest:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch interest" },
        { status: 500 },
      );
    }

    const interest = ((data || []) as InterestLookupResult[])[0];
    return NextResponse.json({
      success: true,
      isInterested: !!interest,
    });
  } catch (error) {
    console.error("Error in opportunity interest GET:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
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

    const resolvedParams = await params;
    const opportunityId = parseInt(resolvedParams.id);

    if (isNaN(opportunityId)) {
      return NextResponse.json(
        { success: false, error: "Invalid opportunity ID" },
        { status: 400 },
      );
    }

    const supabase = createClient();

    const { data: opportunity, error: opportunityError } = await supabase
      .from("opportunities")
      .select("id, title, company, customer_opportunity_id")
      .eq("id", opportunityId)
      .single();

    if (opportunityError || !opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 },
      );
    }

    const { data: interestResult, error } = await supabase.rpc(
      "record_member_opportunity_interest",
      {
        p_user_id: session.id,
        p_opportunity_id: opportunityId,
      },
    );

    const recordedInterest = ((interestResult || []) as RecordInterestResult[])[0];
    if (error || !recordedInterest) {
      console.error("Error inserting interest:", error);
      return NextResponse.json(
        { success: false, error: "Failed to save interest" },
        { status: 500 },
      );
    }

    if (!recordedInterest.inserted) {
      return NextResponse.json({
        success: true,
        message: "Already interested",
        interested: true,
      });
    }

    if (opportunity.customer_opportunity_id) {
      try {
        const { sendSystemNotification } = await import("@/lib/nodemailer");
        await sendSystemNotification(
          "New Member Interest",
          `
          A member expressed interest in a published opportunity:
          - Member: ${session.full_name} (${session.email})
          - Opportunity: ${opportunity.title}
          - Company: ${opportunity.company}
          - CRM Customer Pool ID: ${opportunity.customer_opportunity_id}
        `,
        );
      } catch (notifyError) {
        console.error("Notification Error:", notifyError);
      }
    }

    return NextResponse.json({ success: true, interested: true });
  } catch (error) {
    console.error("Error in opportunity interest POST:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
