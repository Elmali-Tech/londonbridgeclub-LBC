import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase';

type Params = { params: Promise<{ planId: string }> };

// PUT /api/admin/plan-features/[planId]
// Body: { values: [{ feature_id, is_included, text_value }] }
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const { values } = await req.json();

  if (!Array.isArray(values)) {
    return NextResponse.json({ error: 'values must be an array' }, { status: 400 });
  }

  const supabase = createClient();
  const { planId: planIdStr } = await params;
  const planId = parseInt(planIdStr, 10);

  const upsertData = values.map((v: {
    feature_id: number;
    is_included: boolean;
    text_value?: string | null;
  }) => ({
    plan_id: planId,
    feature_id: v.feature_id,
    is_included: v.is_included,
    text_value: v.text_value ?? null,
  }));

  const { error } = await supabase
    .from('plan_feature_values')
    .upsert(upsertData, { onConflict: 'plan_id,feature_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
