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
    .from('plan_features')
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

  const { key, label, description, value_type, sort_order } = await req.json();

  if (!key || !label || !value_type) {
    return NextResponse.json({ error: 'key, label and value_type are required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('plan_features')
    .insert({ key, label, description, value_type, sort_order: sort_order ?? 0, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Yeni özellik için tüm planlara varsayılan değer ekle
  const { data: plans } = await supabase.from('membership_plans').select('id');
  if (plans && plans.length > 0) {
    await supabase.from('plan_feature_values').insert(
      plans.map((p: { id: number }) => ({
        plan_id: p.id,
        feature_id: data.id,
        is_included: false,
        text_value: null,
      }))
    );
  }

  return NextResponse.json(data, { status: 201 });
}
