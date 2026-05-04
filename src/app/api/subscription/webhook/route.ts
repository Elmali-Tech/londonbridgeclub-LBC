import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';
import { headers } from 'next/headers';

interface ExtendedSubscription extends Stripe.Subscription {
  current_period_end: number;
}

interface ExtendedInvoice extends Stripe.Invoice {
  subscription: string;
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (!signature || !webhookSecret) {
      return new NextResponse('Webhook signature or secret missing', { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`);
    return new NextResponse('Webhook error', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as ExtendedSubscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as ExtendedSubscription);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as ExtendedInvoice);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as ExtendedInvoice);
        break;
      default:
        break;
    }
    return new NextResponse('Success', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new NextResponse('Webhook processing error', { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = createClient();
  const userId = session.client_reference_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('Missing client_reference_id in checkout session');
    return;
  }

  if (!customerId || !subscriptionId) {
    if (customerId) {
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
    }
    return;
  }

  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription = subscriptionResponse as unknown as ExtendedSubscription;
  const priceId = subscription.items.data[0]?.price?.id;

  if (!priceId) {
    console.error('No price ID in subscription');
    return;
  }

  // Plan'ı price ID üzerinden bul
  const { data: plan } = await supabase
    .from('membership_plans')
    .select('id, slug, category, stripe_monthly_price_id, stripe_yearly_price_id')
    .or(`stripe_monthly_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`)
    .maybeSingle();

  const planId = plan?.id ?? null;
  const billingCycle = plan?.stripe_monthly_price_id === priceId ? 'monthly' : 'yearly';
  // Geriye dönük uyumluluk için plan_type da belirliyoruz
  const planType = plan?.category === 'corporate' ? 'corporate' : 'personal';

  // Metadata'dan giriş bedeli al
  const entryFeePaid = parseFloat(session.metadata?.entryFeePaid ?? '0') || 0;

  const currentPeriodEnd = subscription.current_period_end;
  const endDate = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('users')
    .update({ stripe_customer_id: customerId, subscription_status: subscription.status })
    .eq('id', userId);

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabase
      .from('subscriptions')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        plan_id: planId,
        billing_cycle: billingCycle,
        plan_type: planType,
        status: subscription.status,
        current_period_end: endDate,
        entry_fee_paid: entryFeePaid,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      plan_id: planId,
      billing_cycle: billingCycle,
      plan_type: planType,
      status: subscription.status,
      current_period_end: endDate,
      entry_fee_paid: entryFeePaid,
    });
  }
}

async function handleSubscriptionUpdated(subscription: ExtendedSubscription) {
  const supabase = createClient();
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!subData) return;

  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('users')
    .update({ subscription_status: subscription.status })
    .eq('id', subData.user_id);

  await supabase.from('subscriptions')
    .update({ status: subscription.status, current_period_end: endDate, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(subscription: ExtendedSubscription) {
  const supabase = createClient();
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!subData) return;

  await supabase.from('users')
    .update({ subscription_status: 'canceled' })
    .eq('id', subData.user_id);

  await supabase.from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleInvoicePaymentFailed(invoice: ExtendedInvoice) {
  const supabase = createClient();
  if (!invoice.subscription) return;

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (!subData) return;

  await supabase.from('users').update({ subscription_status: 'past_due' }).eq('id', subData.user_id);
  await supabase.from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', invoice.subscription);
}

async function handleInvoicePaid(invoice: ExtendedInvoice) {
  const supabase = createClient();
  if (!invoice.subscription) return;

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (!subData) return;

  await supabase.from('users').update({ subscription_status: 'active' }).eq('id', subData.user_id);

  const subscriptionResponse = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const sub = subscriptionResponse as unknown as ExtendedSubscription;
  const endDate = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('subscriptions')
    .update({ status: 'active', current_period_end: endDate, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', invoice.subscription);
}
