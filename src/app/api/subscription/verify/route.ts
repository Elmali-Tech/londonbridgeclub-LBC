import { NextRequest, NextResponse } from "next/server";
import type { Stripe } from "stripe";
import { validateSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

interface ExtendedSubscription extends Stripe.Subscription {
  current_period_end: number;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (typeof sessionId !== "string" || !sessionId) {
      return NextResponse.json({ error: "Session ID missing" }, { status: 400 });
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const checkoutUserId = checkoutSession.client_reference_id || checkoutSession.metadata?.userId;
    if (checkoutUserId !== String(user.id)) {
      return NextResponse.json({ error: "Checkout session does not belong to this user" }, { status: 403 });
    }
    if (checkoutSession.status !== "complete" || checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const subscriptionId =
      typeof checkoutSession.subscription === "string"
        ? checkoutSession.subscription
        : checkoutSession.subscription?.id;
    const customerId =
      typeof checkoutSession.customer === "string"
        ? checkoutSession.customer
        : checkoutSession.customer?.id;

    if (!subscriptionId || !customerId) {
      return NextResponse.json({ error: "Subscription details missing" }, { status: 400 });
    }

    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId,
    )) as unknown as ExtendedSubscription;
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      return NextResponse.json({ error: "Subscription price missing" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("id, slug, category, stripe_monthly_price_id, stripe_yearly_price_id")
      .or(`stripe_monthly_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) {
      return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
    }

    const billingCycle = plan.stripe_monthly_price_id === priceId ? "monthly" : "yearly";
    const planType = plan.category === "corporate" ? "corporate" : "personal";
    const entryFeePaid = Number.parseFloat(checkoutSession.metadata?.entryFeePaid || "0") || 0;
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        stripe_customer_id: customerId,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (userUpdateError) throw userUpdateError;

    const { error: subscriptionError } = await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        plan_id: plan.id,
        billing_cycle: billingCycle,
        plan_type: planType,
        status: subscription.status,
        current_period_end: currentPeriodEnd,
        entry_fee_paid: entryFeePaid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );
    if (subscriptionError) throw subscriptionError;

    return NextResponse.json({
      success: true,
      customer: customerId,
      subscription: subscriptionId,
      planId: plan.id,
      planSlug: plan.slug,
      billingCycle,
      entryFeePaid,
      subscriptionDetails: {
        status: subscription.status,
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (error) {
    console.error("POST /api/subscription/verify failed", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
