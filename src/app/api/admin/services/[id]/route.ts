import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        partners:partner_id ( id, name ),
        customers:customer_id ( id, company_name )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, service: data });
  } catch (error) {
    console.error('GET /api/admin/services/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { name, description, partner_id, customer_id, status } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Service name is required' }, { status: 400 });
    }
    if (!partner_id) {
      return NextResponse.json({ success: false, error: 'Partner is required' }, { status: 400 });
    }
    if (!customer_id) {
      return NextResponse.json({ success: false, error: 'Customer is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('services')
      .update({
        name: name.trim(),
        description: description || null,
        partner_id,
        customer_id,
        status: status || 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        partners:partner_id ( id, name ),
        customers:customer_id ( id, company_name )
      `)
      .single();

    if (error) {
      console.error('PUT /api/admin/services/[id] error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update service' }, { status: 500 });
    }

    return NextResponse.json({ success: true, service: data });
  } catch (error) {
    console.error('PUT /api/admin/services/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('services').delete().eq('id', id);

    if (error) {
      console.error('DELETE /api/admin/services/[id] error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete service' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/services/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
