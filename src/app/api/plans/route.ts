import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();

    const [{ data: plans, error: plansError }, { data: features, error: featuresError }] =
      await Promise.all([
        supabase.from('membership_plans').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('plan_features').select('*').eq('is_active', true).order('sort_order'),
      ]);

    if (plansError) throw plansError;
    if (featuresError) throw featuresError;
    if (!plans || plans.length === 0) return NextResponse.json([]);

    const { data: featureValues, error: fvError } = await supabase
      .from('plan_feature_values')
      .select('id, plan_id, feature_id, is_included, text_value')
      .in('plan_id', plans.map(p => p.id));

    if (fvError) throw fvError;

    const featuresMap = new Map((features ?? []).map(f => [f.id, f]));

    const result = plans.map(plan => ({
      ...plan,
      plan_feature_values: (featureValues ?? [])
        .filter(fv => fv.plan_id === plan.id)
        .map(fv => ({ ...fv, plan_features: featuresMap.get(fv.feature_id) ?? null })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
