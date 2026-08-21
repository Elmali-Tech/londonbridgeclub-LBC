import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List all customers, with a contact count for each
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const supabase = createClient();
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('company_name', { ascending: true });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
    }

    const { data: contactRows } = await supabase
      .from('customer_contacts')
      .select('customer_id');

    const contactCounts = new Map<number, number>();
    (contactRows || []).forEach((row: { customer_id: number }) => {
      contactCounts.set(row.customer_id, (contactCounts.get(row.customer_id) || 0) + 1);
    });

    const enriched = (customers || []).map((customer) => ({
      ...customer,
      contact_count: contactCounts.get(customer.id) || 0,
    }));

    return NextResponse.json({ success: true, customers: enriched });
  } catch (error) {
    console.error('GET /api/admin/customers error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { company_name, industry, website_url, address, solutions_used, responsible_person } = body;

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
