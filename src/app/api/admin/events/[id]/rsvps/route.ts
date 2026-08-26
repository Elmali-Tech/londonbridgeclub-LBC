import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

type Params = { params: Promise<{ id: string }> };

// GET - Admin: list all RSVPs for an event with user details
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('*, users(full_name, email)')
      .eq('event_id', id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ success: false, error: 'Failed to fetch RSVPs' }, { status: 500 });
    return NextResponse.json({ success: true, rsvps: data || [] });
  } catch (error) {
    console.error('GET /api/admin/events/[id]/rsvps error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Admin: remove a specific RSVP by rsvp id (passed as query param)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const rsvpId = searchParams.get('rsvpId');
    if (!rsvpId) return NextResponse.json({ success: false, error: 'rsvpId is required' }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase.from('event_rsvps').delete().eq('id', rsvpId);

    if (error) return NextResponse.json({ success: false, error: 'Failed to remove RSVP' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/events/[id]/rsvps error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
