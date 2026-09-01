import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const supabase = createClient();
    const [{ data: customers, error }, { data: contactRows }, { data: partners }] = await Promise.all([
      supabase.from('customers').select('*').order('company_name', { ascending: true }),
      supabase.from('customer_contacts').select('customer_id'),
      supabase.from('partners').select('id, name'),
    ]);

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
    }

    const contactCounts = new Map<number, number>();
    (contactRows || []).forEach((row: { customer_id: number }) => {
      contactCounts.set(row.customer_id, (contactCounts.get(row.customer_id) || 0) + 1);
    });

    const partnerMap = new Map<number, string>();
    (partners || []).forEach((p: { id: number; name: string }) => partnerMap.set(p.id, p.name));

    const enriched = (customers || []).map((customer) => ({
      ...customer,
      contact_count: contactCounts.get(customer.id) || 0,
      partner_name: customer.partner_id ? (partnerMap.get(customer.partner_id) ?? null) : null,
    }));

    return NextResponse.json({ success: true, customers: enriched });
  } catch (error) {
    console.error('GET /api/admin/customers error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { company_name, industry, website_url, address, solutions_used, responsible_person, partner_id } = body;

    if (!company_name || !company_name.trim()) {
      return NextResponse.json({ success: false, error: 'Company name is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        company_name: company_name.trim(),
        industry: industry || null,
        website_url: website_url || null,
        address: address || null,
        solutions_used: solutions_used || null,
        responsible_person: responsible_person || null,
        partner_id: partner_id || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json({ success: false, error: 'Failed to create customer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/customers error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
