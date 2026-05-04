import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';

// POST /api/subscription/cancel
// Aboneliği dönem sonunda iptal eder (hemen kesmez)
export async function POST(req: NextRequest) {
  const user = await validateSession(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !subscription) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
  }

  if (!subscription.stripe_subscription_id) {
    return NextResponse.json({ error: 'No Stripe subscription ID' }, { status: 422 });
  }

  try {
    // Dönem sonunda iptal et (cancel_at_period_end = true)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // DB'de status'u "active" bırak — kullanıcı dönem sonuna kadar erişmeye devam eder
    // Stripe webhook "customer.subscription.deleted" geldiğinde "canceled" olacak
    // Sadece cancel_at_period_end bilgisini kaydet
    await supabase
      .from('subscriptions')
      .update({ updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    return NextResponse.json({ success: true, message: 'Subscription will be canceled at period end' });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
