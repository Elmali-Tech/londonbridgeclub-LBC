import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List notes logged against a meeting
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data: notes, error } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('meeting_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meeting notes:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error('GET /api/admin/meetings/[id]/notes error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Append a note to a meeting
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { note } = await request.json();

    if (!note || !note.trim()) {
      return NextResponse.json({ success: false, error: 'Note text is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id')
      .eq('id', id)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const { data: noteRow, error } = await supabase
      .from('meeting_notes')
      .insert({
        meeting_id: id,
        note: note.trim(),
        logged_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding meeting note:', error);
      return NextResponse.json({ success: false, error: 'Failed to add note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: noteRow }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/meetings/[id]/notes error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
