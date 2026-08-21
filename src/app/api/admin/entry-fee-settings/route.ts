import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('entry_fee_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const { is_active, threshold } = await req.json();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('entry_fee_settings')
    .upsert({
      id: 1,
      is_active: is_active ?? false,
      threshold: threshold ?? 50,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
