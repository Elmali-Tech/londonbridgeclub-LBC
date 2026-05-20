import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateSession } from "@/lib/auth";

const canViewInterests = (role?: string | null, isAdmin?: boolean) =>
  isAdmin ||
  role === "admin" ||
  role === "opportunity_manager" ||
  role === "sales_member";

type InterestRow = {
  id: number;
  user_id: number;
  opportunity_id: number;
  customer_opportunity_id: number | null;
  status: string | null;
  notes: string | null;
  followed_up_at: string | null;
  created_at: string;
};

type InterestUser = {
  id: number;
  full_name: string | null;
  email: string | null;
};

type InterestOpportunity = {
  id: number;
  title: string;
  customer_opportunity_id: number | null;
};

export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session || !canViewInterests(session.role, session.is_admin)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    const supabase = createClient();
    const { data: interests, error } = await supabase.rpc(
      "list_opportunity_interests_for_crm",
    );

    if (error) {
      console.error("Fetch opportunity interests error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch opportunity interests" },
        { status: 500 },
      );
    }

    const interestRows = (interests || []) as InterestRow[];
    const userIds = Array.from(
      new Set(interestRows.map((interest) => interest.user_id)),
    );
    const opportunityIds = Array.from(
      new Set(interestRows.map((interest) => interest.opportunity_id)),
    );

    const [{ data: users }, { data: opportunities }] = await Promise.all([
      userIds.length
        ? supabase.from("users").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] }),
      opportunityIds.length
        ? supabase
            .from("opportunities")
            .select("id, title, customer_opportunity_id")
            .in("id", opportunityIds)
        : Promise.resolve({ data: [] }),
    ]);

    const usersById = new Map(
      ((users || []) as InterestUser[]).map((user) => [user.id, user]),
    );
    const opportunitiesById = new Map(
      ((opportunities || []) as InterestOpportunity[]).map((opportunity) => [
        opportunity.id,
        opportunity,
      ]),
    );

    const enrichedInterests = interestRows.map((interest) => {
      const opportunity = opportunitiesById.get(interest.opportunity_id);
      return {
        ...interest,
        customer_opportunity_id:
          interest.customer_opportunity_id ||
          opportunity?.customer_opportunity_id ||
          null,
        user: usersById.get(interest.user_id) || null,
        opportunity: opportunity || null,
      };
    });

    return NextResponse.json({ success: true, interests: enrichedInterests });
  } catch (error) {
    console.error("Customer opportunity interests API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
