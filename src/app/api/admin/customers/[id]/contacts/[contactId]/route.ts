import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string; contactId: string }> };

// PUT - Update a contact
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id, contactId } = await params;
    const body = await request.json();
    const { full_name, title, email, phone, is_primary, notes } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ success: false, error: 'Contact name is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: contact, error } = await supabase
      .from('customer_contacts')
      .update({
        full_name: full_name.trim(),
        title: title || null,
        email: email || null,
        phone: phone || null,
        is_primary: !!is_primary,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .eq('customer_id', id)
      .select()
      .single();

    if (error || !contact) {
      console.error('Error updating contact:', error);
      return NextResponse.json({ success: false, error: 'Failed to update contact' }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('PUT /api/admin/customers/[id]/contacts/[contactId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a contact
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id, contactId } = await params;
    const supabase = createClient();
    const { error } = await supabase
      .from('customer_contacts')
      .delete()
      .eq('id', contactId)
      .eq('customer_id', id);

    if (error) {
      console.error('Error deleting contact:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete contact' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/customers/[id]/contacts/[contactId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
