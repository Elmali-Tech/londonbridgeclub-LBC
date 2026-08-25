import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await validateSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const [{ data: userStatus, error: userError }, { data: subscriptions, error: subscriptionError }] =
      await Promise.all([
        supabase
          .from("users")
          .select("subscription_status")
          .eq("id", user.id)
          .single(),
        supabase
          .from("subscriptions")
          .select("*, membership_plans(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (userError) throw userError;
    if (subscriptionError) throw subscriptionError;

    const activeSubscription = (subscriptions || []).find((subscription) =>
      ["active", "trialing", "past_due"].includes(subscription.status),
    ) || null;

    return NextResponse.json(
      {
        status: userStatus?.subscription_status === "active" ? "active" : "inactive",
        hasAnySubscription: (subscriptions || []).length > 0,
        subscription: activeSubscription,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/subscription/status failed", error);
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}
