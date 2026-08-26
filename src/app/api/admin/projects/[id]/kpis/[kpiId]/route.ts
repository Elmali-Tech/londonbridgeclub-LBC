import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;
type Params = { params: Promise<{ id: string; kpiId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { kpiId } = await params;
    const body = await request.json();
    const { name, target, actual, unit } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'KPI name is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_kpis')
      .update({ name, target: target || null, actual: actual || null, unit: unit || null, updated_at: new Date().toISOString() })
      .eq('id', kpiId)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: 'Failed to update KPI' }, { status: 500 });
    return NextResponse.json({ success: true, kpi: data });
  } catch (error) {
    console.error('PUT /api/admin/projects/[id]/kpis/[kpiId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { kpiId } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('project_kpis').delete().eq('id', kpiId);

    if (error) return NextResponse.json({ success: false, error: 'Failed to delete KPI' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/projects/[id]/kpis/[kpiId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
