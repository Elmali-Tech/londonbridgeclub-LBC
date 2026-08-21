import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List reminders, optionally only incomplete/upcoming ones
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get('upcoming') === 'true';

    const supabase = createClient();
    let query = supabase.from('reminders').select('*').order('due_date', { ascending: true });
    if (upcoming) {
      query = query.eq('is_completed', false);
    }

    const { data: reminders, error } = await query;

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reminders });
  } catch (error) {
    console.error('GET /api/admin/reminders error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { title, due_date, customer_id, meeting_id, customer_opportunity_id, assigned_to, notes } = body;

    if (!title || !due_date) {
      return NextResponse.json({ success: false, error: 'Title and due date are required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        title,
        due_date,
        customer_id: customer_id || null,
        meeting_id: meeting_id || null,
        customer_opportunity_id: customer_opportunity_id || null,
        assigned_to: assigned_to || null,
        notes: notes || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json({ success: false, error: 'Failed to create reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reminder }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/reminders error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
