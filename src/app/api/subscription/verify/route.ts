import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/lbc-data';
import { Stripe } from 'stripe';
import { validateSession } from '@/lib/auth';
import { callLbcEndpoint, LbcEndpoint } from '@/lib/lbc-api';

interface ExtendedSubscription extends Stripe.Subscription {
  current_period_end: number;
}

function stripeValueToString(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!value) return '';
  return typeof value === 'string' ? value : value.id;
}

function subscriptionValueToString(value: string | Stripe.Subscription | null) {
  if (!value) return '';
  return typeof value === 'string' ? value : value.id;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await validateSession(req);
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
        const lbcData = createClient();
        const { data: plan } = await lbcData
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
    const customerId = stripeValueToString(session.customer);
    const subscriptionId = subscriptionValueToString(session.subscription);

    if (authUser && session.subscription) {
      const endDate = subscriptionDetails?.current_period_end
        ? new Date(subscriptionDetails.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const subscriptionStatus = subscriptionDetails?.status ?? 'active';

      if (authUser.auth_provider === 'lbc' && authUser.lbc_record_id) {
        const result = await callLbcEndpoint('/subscriptions' as LbcEndpoint, {
          logicalMethod: 'POST',
          payload: {
            member_id: authUser.lbc_record_id,
            lbc_member_id: authUser.lbc_member_id,
            processor: 'stripe',
            processor_customer_id: customerId,
            processor_subscription_id: subscriptionId,
            plan_id: metaPlanId,
            tier: metaPlanSlug,
            billing_cycle: metaBillingCycle,
            status: subscriptionStatus,
            current_period_end: endDate,
            entry_fee_paid: entryFeePaid,
          },
          idempotencyKey: `stripe:${session.id}`,
        });

        if (!result.success) {
          console.warn('LBC subscription sync failed:', result.error || result.bodyError?.code);
        }
      } else {
        const lbcData = createClient();

        await lbcData
          .from('users')
          .update({ subscription_status: subscriptionStatus, stripe_customer_id: customerId })
          .eq('id', authUser.id);

        const { data: existing } = await lbcData
          .from('subscriptions')
          .select('id')
          .eq('user_id', authUser.id)
          .single();

        const subscriptionPayload = {
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          plan_id: metaPlanId ?? null,
          billing_cycle: metaBillingCycle ?? 'monthly',
          status: subscriptionStatus,
          current_period_end: endDate,
          entry_fee_paid: entryFeePaid,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          await lbcData.from('subscriptions').update(subscriptionPayload).eq('id', existing.id);
        } else {
          await lbcData.from('subscriptions').insert({ ...subscriptionPayload, user_id: authUser.id });
        }
      }
    }

    return NextResponse.json({
      success: true,
      customer: customerId,
      subscription: subscriptionId,
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
