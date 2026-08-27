import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

type Params = { params: Promise<{ id: string }> };

// POST - Member RSVPs to an event (upserts so they can change their status)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager', 'sales_member', 'viewer']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { status = 'attending', notes } = body;

    if (!['attending', 'maybe', 'declined'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_rsvps')
      .upsert(
        { event_id: Number(id), user_id: auth.user.id, status, notes: notes || null, updated_at: new Date().toISOString() },
        { onConflict: 'event_id,user_id' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: 'Failed to save RSVP' }, { status: 500 });
    return NextResponse.json({ success: true, rsvp: data });
  } catch (error) {
    console.error('POST /api/events/[id]/rsvp error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get the current user's RSVP for an event
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager', 'sales_member', 'viewer']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    return NextResponse.json({ success: true, rsvp: data || null });
  } catch (error) {
    console.error('GET /api/events/[id]/rsvp error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel RSVP
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager', 'sales_member', 'viewer']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    await supabase.from('event_rsvps').delete().eq('event_id', id).eq('user_id', auth.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/events/[id]/rsvp error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
