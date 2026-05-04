import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
    }

    const { planId, billingCycle, userId } = await req.json();

    if (!planId || !billingCycle) {
      return NextResponse.json({ error: 'planId and billingCycle are required' }, { status: 400 });
    }
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json({ error: 'billingCycle must be monthly or yearly' }, { status: 400 });
    }

    const supabase = createClient();

    // Planı DB'den al
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, name, slug, stripe_monthly_price_id, stripe_yearly_price_id, entry_fee_early, entry_fee_standard')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const newPriceId = billingCycle === 'yearly'
      ? plan.stripe_yearly_price_id
      : plan.stripe_monthly_price_id;

    if (!newPriceId) {
      return NextResponse.json(
        { error: 'Stripe Price ID not configured for this plan. Please contact admin.' },
        { status: 422 }
      );
    }

    // ─── Mevcut abonelik kontrolü ───────────────────────────────────
    if (userId) {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, stripe_subscription_id, stripe_customer_id, plan_id')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Kullanıcının aktif aboneliği varsa → UPGRADE yap (yeni checkout açma!)
      if (existingSub?.stripe_subscription_id) {
        // Aynı planı tekrar seçiyorsa engelle
        if (existingSub.plan_id === planId) {
          return NextResponse.json(
            { error: 'You are already subscribed to this plan.' },
            { status: 400 }
          );
        }

        try {
          // Stripe'taki mevcut subscription'ı al
          const stripeSub = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);
          const currentItemId = stripeSub.items.data[0]?.id;

          if (!currentItemId) {
            return NextResponse.json({ error: 'Could not find subscription item' }, { status: 500 });
          }

          // Subscription'ı yeni price'a güncelle (proration ile)
          const updatedSub = await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
            items: [{ id: currentItemId, price: newPriceId }],
            proration_behavior: 'create_prorations', // Fiyat farkını hesapla
          });

          // DB'yi güncelle
          const newBillingCycle = billingCycle;
          const currentPeriodEnd = (updatedSub as any).current_period_end;
          const endDate = currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : null;

          await supabase
            .from('subscriptions')
            .update({
              plan_id: plan.id,
              billing_cycle: newBillingCycle,
              plan_type: plan.slug,
              status: updatedSub.status,
              ...(endDate ? { current_period_end: endDate } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);

          return NextResponse.json({
            upgraded: true,
            message: `Plan upgraded to ${plan.name}`,
            subscription: { id: existingSub.id, plan_name: plan.name, billing_cycle: newBillingCycle },
          });
        } catch (stripeErr) {
          console.error('Stripe upgrade error:', stripeErr);
          return NextResponse.json(
            { error: 'Failed to upgrade plan: ' + (stripeErr as Error).message },
            { status: 500 }
          );
        }
      }
    }

    // ─── Yeni abonelik (ilk defa) → Checkout Session ───────────────
    // Giriş bedeli hesapla
    let entryFeeAmount = 0;
    const { data: entrySettings } = await supabase
      .from('entry_fee_settings')
      .select('is_active, threshold')
      .eq('id', 1)
      .single();

    if (entrySettings?.is_active) {
      const { count } = await supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      const memberCount = count ?? 0;
      entryFeeAmount = memberCount < entrySettings.threshold
        ? plan.entry_fee_early
        : plan.entry_fee_standard;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Line items: abonelik fiyatı + (varsa) giriş bedeli
    const lineItems: Array<{ price: string; quantity: number } | { price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }> = [
      { price: newPriceId, quantity: 1 },
    ];

    if (entryFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: `${plan.name} Entry Fee` },
          unit_amount: Math.round(entryFeeAmount * 100),
        },
        quantity: 1,
      });
    }

    // Mevcut Stripe customer varsa onu kullan
    let stripeCustomerId: string | undefined;
    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      if (userData?.stripe_customer_id) {
        stripeCustomerId = userData.stripe_customer_id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${baseUrl}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/membership`,
      client_reference_id: userId ? String(userId) : undefined,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      metadata: {
        userId: userId ? String(userId) : '',
        planId: String(plan.id),
        planSlug: plan.slug,
        billingCycle,
        entryFeePaid: String(entryFeeAmount),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Stripe error: ' + error.message, type: error.type },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Error creating checkout session: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
