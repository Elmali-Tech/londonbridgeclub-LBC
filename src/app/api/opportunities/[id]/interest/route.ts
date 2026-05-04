import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateSession } from "@/lib/auth";

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

    // Check if the interest exists for this user and opportunity
    const { data, error } = await supabase
      .from("opportunity_interests")
      .select("id")
      .eq("user_id", session.id)
      .eq("opportunity_id", opportunityId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching interest:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch interest" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      isInterested: !!data,
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

    // Check if already interested
    const { data: existingInterest } = await supabase
      .from("opportunity_interests")
      .select("id")
      .eq("user_id", session.id)
      .eq("opportunity_id", opportunityId)
      .maybeSingle();

    if (existingInterest) {
      return NextResponse.json({
        success: true,
        message: "Already interested",
        interested: true,
      });
    }

    // Insert new interest
    const { error } = await supabase.from("opportunity_interests").insert({
      user_id: session.id,
      opportunity_id: opportunityId,
    });

    if (error) {
      console.error("Error inserting interest:", error);
      return NextResponse.json(
        { success: false, error: "Failed to save interest" },
        { status: 500 },
      );
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
