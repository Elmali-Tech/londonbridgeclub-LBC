import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { syncPriceFromStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';

// POST /api/admin/plans/sync-prices — Tüm planların fiyatlarını Stripe'dan senkronize et
export async function POST(req: NextRequest) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: plans, error } = await supabase
    .from('membership_plans')
    .select('id, name, stripe_monthly_price_id, stripe_yearly_price_id')
    .eq('is_active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ id: number; name: string; monthly: number | null; yearly: number | null; error?: string }> = [];

  for (const plan of plans ?? []) {
    let monthlyAmount: number | null = null;
    let yearlyAmount: number | null = null;

    if (plan.stripe_monthly_price_id) {
      const monthly = await syncPriceFromStripe(plan.stripe_monthly_price_id);
      monthlyAmount = monthly?.amount ?? null;
    }

    if (plan.stripe_yearly_price_id) {
      const yearly = await syncPriceFromStripe(plan.stripe_yearly_price_id);
      yearlyAmount = yearly?.amount ?? null;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (monthlyAmount !== null) updates.monthly_price = monthlyAmount;
    if (yearlyAmount !== null) updates.yearly_price = yearlyAmount;

    if (Object.keys(updates).length > 1) {
      const { error: updateErr } = await supabase
        .from('membership_plans')
        .update(updates)
        .eq('id', plan.id);

      if (updateErr) {
        results.push({ id: plan.id, name: plan.name, monthly: monthlyAmount, yearly: yearlyAmount, error: updateErr.message });
      } else {
        results.push({ id: plan.id, name: plan.name, monthly: monthlyAmount, yearly: yearlyAmount });
      }
    } else {
      results.push({ id: plan.id, name: plan.name, monthly: monthlyAmount, yearly: yearlyAmount, error: 'No Stripe Price IDs configured' });
    }
  }

  return NextResponse.json({ synced: results });
}
