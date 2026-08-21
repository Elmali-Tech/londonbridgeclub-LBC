import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List meetings, optionally filtered by customer
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    const supabase = createClient();
    let query = supabase.from('meetings').select('*').order('meeting_date', { ascending: false });
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch meetings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, meetings });
  } catch (error) {
    console.error('GET /api/admin/meetings error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Log a new meeting
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

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
      .insert({
        customer_id,
        contact_id: contact_id || null,
        customer_opportunity_id: customer_opportunity_id || null,
        title,
        meeting_date,
        meeting_time: meeting_time || null,
        meeting_type: meeting_type || 'In-Person',
        attendees: attendees || null,
        notes: notes || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return NextResponse.json({ success: false, error: 'Failed to create meeting' }, { status: 500 });
    }

    return NextResponse.json({ success: true, meeting }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/meetings error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
