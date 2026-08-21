import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// POST - Add a contact to a customer
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { full_name, title, email, phone, is_primary, notes } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ success: false, error: 'Contact name is required' }, { status: 400 });
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const { data: contact, error } = await supabase
      .from('customer_contacts')
      .insert({
        customer_id: id,
        full_name: full_name.trim(),
        title: title || null,
        email: email || null,
        phone: phone || null,
        is_primary: !!is_primary,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding contact:', error);
      return NextResponse.json({ success: false, error: 'Failed to add contact' }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/customers/[id]/contacts error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
