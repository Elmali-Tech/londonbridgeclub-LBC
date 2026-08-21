import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string }> };

// GET - Fetch a single meeting
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data: meeting, error } = await supabase.from('meetings').select('*').eq('id', id).single();

    if (error || !meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('GET /api/admin/meetings/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a meeting
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const {
      customer_id, contact_id, customer_opportunity_id,
      title, meeting_date, meeting_time, meeting_type, attendees, notes,
    } = body;

    if (!customer_id || !title || !meeting_date) {
      return NextResponse.json(
        { success: false, error: 'Customer, title, and meeting date are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: meeting, error } = await supabase
      .from('meetings')
      .update({
        customer_id,
        contact_id: contact_id || null,
        customer_opportunity_id: customer_opportunity_id || null,
        title,
        meeting_date,
        meeting_time: meeting_time || null,
        meeting_type: meeting_type || 'In-Person',
        attendees: attendees || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating meeting:', error);
      return NextResponse.json({ success: false, error: 'Failed to update meeting' }, { status: 500 });
    }

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('PUT /api/admin/meetings/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a meeting
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('meetings').delete().eq('id', id);

    if (error) {
      console.error('Error deleting meeting:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete meeting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/meetings/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
