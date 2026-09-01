import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string }> };

// GET - Full customer detail: the company record, its contacts, and its notes
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();

    const [{ data: customer, error: customerError }, { data: contacts }, { data: notes }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('customer_contacts').select('*').eq('customer_id', id).order('is_primary', { ascending: false }),
      supabase.from('customer_notes').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ]);

    if (customerError || !customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer, contacts: contacts || [], notes: notes || [] });
  } catch (error) {
    console.error('GET /api/admin/customers/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a customer
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { company_name, industry, website_url, address, solutions_used, responsible_person, partner_id } = body;

    if (!company_name || !company_name.trim()) {
      return NextResponse.json({ success: false, error: 'Company name is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        company_name: company_name.trim(),
        industry: industry || null,
        website_url: website_url || null,
        address: address || null,
        solutions_used: solutions_used || null,
        responsible_person: responsible_person || null,
        partner_id: partner_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return NextResponse.json({ success: false, error: 'Failed to update customer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('PUT /api/admin/customers/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a customer (cascades to its contacts and notes)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('customers').delete().eq('id', id);

    if (error) {
      console.error('Error deleting customer:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete customer' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/customers/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
