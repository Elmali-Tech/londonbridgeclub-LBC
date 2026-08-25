import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const supabase = createClient();
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("*, membership_plans(*)")
      .order("created_at", { ascending: false });

    if (subscriptionsError) throw subscriptionsError;

    const userIds = [...new Set((subscriptions || []).map((subscription) => subscription.user_id))];
    const { data: users, error: usersError } = userIds.length
      ? await supabase
          .from("users")
          .select("id, full_name, email, profile_image_key")
          .in("id", userIds)
      : { data: [], error: null };

    if (usersError) throw usersError;

    const usersById = new Map((users || []).map((user) => [user.id, user]));
    const result = (subscriptions || []).map((subscription) => ({
      ...subscription,
      user: usersById.get(subscription.user_id) || {
        full_name: "Unknown",
        email: "—",
      },
    }));

    return NextResponse.json(
      { subscriptions: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/admin/subscriptions failed", error);
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}
