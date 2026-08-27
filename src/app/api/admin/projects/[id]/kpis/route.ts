import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_kpis')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ success: false, error: 'Failed to fetch KPIs' }, { status: 500 });
    return NextResponse.json({ success: true, kpis: data || [] });
  } catch (error) {
    console.error('GET /api/admin/projects/[id]/kpis error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { name, target, actual, unit } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'KPI name is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_kpis')
      .insert({ project_id: Number(id), name, target: target || null, actual: actual || null, unit: unit || null, created_by: auth.user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: 'Failed to create KPI' }, { status: 500 });
    return NextResponse.json({ success: true, kpi: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/projects/[id]/kpis error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
