import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        partners:partner_id ( id, name ),
        customers:customer_id ( id, company_name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/admin/services error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch services' }, { status: 500 });
    }

    return NextResponse.json({ success: true, services: data ?? [] });
  } catch (error) {
    console.error('GET /api/admin/services error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

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
      .insert({
        name: name.trim(),
        description: description || null,
        partner_id,
        customer_id,
        status: status || 'active',
        created_by: auth.user.id,
      })
      .select(`
        *,
        partners:partner_id ( id, name ),
        customers:customer_id ( id, company_name )
      `)
      .single();

    if (error) {
      console.error('POST /api/admin/services error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create service' }, { status: 500 });
    }

    return NextResponse.json({ success: true, service: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/services error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
