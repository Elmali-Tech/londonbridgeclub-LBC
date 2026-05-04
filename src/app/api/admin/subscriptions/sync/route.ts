import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';

// POST /api/admin/subscriptions/sync — Stripe'tan tüm aboneliklerin güncel durumunu çek
export async function POST(req: NextRequest) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  // Tüm subscriptions'ları al
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, user_id, status')
    .not('stripe_subscription_id', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;

  for (const sub of subs ?? []) {
    if (!sub.stripe_subscription_id) continue;

    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const currentPeriodEnd = (stripeSub as any).current_period_end;
      const endDate = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null;

      const newStatus = stripeSub.status as string;

      // DB'yi güncelle
      await supabase
        .from('subscriptions')
        .update({
          status: newStatus,
          ...(endDate ? { current_period_end: endDate } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);

      // User'ın subscription_status'unu da güncelle
      await supabase
        .from('users')
        .update({ subscription_status: newStatus })
        .eq('id', sub.user_id);

      synced++;
    } catch (err) {
      console.error(`Failed to sync subscription ${sub.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    message: `Synced ${synced} subscriptions${failed > 0 ? `, ${failed} failed` : ''}`,
    synced,
    failed,
    total: subs?.length ?? 0,
  });
}
