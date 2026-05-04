import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, slug, category, description, monthly_price, yearly_price,
          stripe_monthly_price_id, stripe_yearly_price_id,
          entry_fee_early, entry_fee_standard, highlighted, sort_order } = body;

  if (!name || !slug || !category || monthly_price == null || yearly_price == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('membership_plans')
    .insert({
      name, slug, category, description,
      monthly_price, yearly_price,
      stripe_monthly_price_id: stripe_monthly_price_id || null,
      stripe_yearly_price_id: stripe_yearly_price_id || null,
      entry_fee_early: entry_fee_early ?? 0,
      entry_fee_standard: entry_fee_standard ?? 0,
      highlighted: highlighted ?? false,
      sort_order: sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
