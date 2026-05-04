import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { syncPriceFromStripe } from '@/lib/stripe';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createClient();

  const [
    { data: plan, error: planError },
    { data: featureValues, error: fvError },
    { data: features, error: featuresError },
  ] = await Promise.all([
    supabase.from('membership_plans').select('*').eq('id', id).single(),
    supabase.from('plan_feature_values').select('id, feature_id, is_included, text_value').eq('plan_id', id),
    supabase.from('plan_features').select('*').eq('is_active', true).order('sort_order'),
  ]);

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 });
  if (fvError) return NextResponse.json({ error: fvError.message }, { status: 500 });
  if (featuresError) return NextResponse.json({ error: featuresError.message }, { status: 500 });

  const featuresMap = new Map((features ?? []).map(f => [f.id, f]));
  const enrichedValues = (featureValues ?? []).map(fv => ({
    ...fv,
    plan_features: featuresMap.get(fv.feature_id) ?? null,
  }));

  return NextResponse.json({ ...plan, plan_feature_values: enrichedValues });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = createClient();

  // Stripe Price ID değiştiyse otomatik fiyat çek
  if (body.stripe_monthly_price_id) {
    const monthly = await syncPriceFromStripe(body.stripe_monthly_price_id);
    if (monthly) body.monthly_price = monthly.amount;
  }
  if (body.stripe_yearly_price_id) {
    const yearly = await syncPriceFromStripe(body.stripe_yearly_price_id);
    if (yearly) body.yearly_price = yearly.amount;
  }

  // Sadece membership_plans tablosunda olan sütunları güncelle
  const allowedFields = [
    'name', 'slug', 'category', 'description',
    'monthly_price', 'yearly_price',
    'stripe_monthly_price_id', 'stripe_yearly_price_id',
    'entry_fee_early', 'entry_fee_standard',
    'is_active', 'highlighted', 'sort_order',
  ];

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in body) updateData[key] = body[key];
  }

  const { data, error } = await supabase
    .from('membership_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createClient();

  const { error } = await supabase
    .from('membership_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
