import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string }> };

// PUT - Update a reminder (full edit, or just { is_completed: true/false } to toggle)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if ('title' in body) updates.title = body.title;
    if ('due_date' in body) updates.due_date = body.due_date;
    if ('customer_id' in body) updates.customer_id = body.customer_id || null;
    if ('meeting_id' in body) updates.meeting_id = body.meeting_id || null;
    if ('customer_opportunity_id' in body) updates.customer_opportunity_id = body.customer_opportunity_id || null;
    if ('assigned_to' in body) updates.assigned_to = body.assigned_to || null;
    if ('notes' in body) updates.notes = body.notes || null;
    if ('is_completed' in body) {
      updates.is_completed = !!body.is_completed;
      updates.completed_at = body.is_completed ? new Date().toISOString() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: reminder, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      return NextResponse.json({ success: false, error: 'Failed to update reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error('PUT /api/admin/reminders/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a reminder
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('reminders').delete().eq('id', id);

    if (error) {
      console.error('Error deleting reminder:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/reminders/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
