import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List communication-log entries for a customer
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { data: notes, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error('GET /api/admin/customers/[id]/notes error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Append a communication-log entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { note } = await request.json();

    if (!note || !note.trim()) {
      return NextResponse.json({ success: false, error: 'Note text is required' }, { status: 400 });
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const { data: noteRow, error } = await supabase
      .from('customer_notes')
      .insert({
        customer_id: id,
        note: note.trim(),
        logged_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return NextResponse.json({ success: false, error: 'Failed to add note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: noteRow }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/customers/[id]/notes error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
