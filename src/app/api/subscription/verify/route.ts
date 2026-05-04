import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';
import { Stripe } from 'stripe';

interface ExtendedSubscription extends Stripe.Subscription {
  current_period_end: number;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID missing' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    let subscriptionDetails = null;
    let planId: number | null = null;
    let billingCycle: string = 'monthly';
    let planSlug: string | null = null;

    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      subscriptionDetails = sub as unknown as ExtendedSubscription;

      const priceId = subscriptionDetails.items.data[0]?.price?.id;

      if (priceId) {
        const supabase = createClient();
        const { data: plan } = await supabase
          .from('membership_plans')
          .select('id, slug, stripe_monthly_price_id, stripe_yearly_price_id')
          .or(`stripe_monthly_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`)
          .maybeSingle();

        if (plan) {
          planId = plan.id;
          planSlug = plan.slug;
          billingCycle = plan.stripe_monthly_price_id === priceId ? 'monthly' : 'yearly';
        }
      }
    }

    // Metadata'dan bilgileri al (checkout session'dan)
    const metaPlanId = session.metadata?.planId ? parseInt(session.metadata.planId) : planId;
    const metaBillingCycle = session.metadata?.billingCycle || billingCycle;
    const metaPlanSlug = session.metadata?.planSlug || planSlug;
    const entryFeePaid = parseFloat(session.metadata?.entryFeePaid ?? '0') || 0;

    return NextResponse.json({
      success: true,
      customer: session.customer,
      subscription: session.subscription,
      client_reference_id: session.client_reference_id,
      planId: metaPlanId,
      planSlug: metaPlanSlug,
      billingCycle: metaBillingCycle,
      entryFeePaid,
      subscriptionDetails: subscriptionDetails
        ? {
            status: subscriptionDetails.status,
            current_period_end: subscriptionDetails.current_period_end,
          }
        : null,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}
