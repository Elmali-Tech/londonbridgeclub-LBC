import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string }> };

// PUT - Update a task (full edit, or a partial update like { status: 'Done' })
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ('title' in body) {
      if (!body.title || !body.title.trim()) {
        return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
      }
      updates.title = body.title.trim();
    }
    if ('description' in body) updates.description = body.description || null;
    if ('project_id' in body) updates.project_id = body.project_id || null;
    if ('customer_id' in body) updates.customer_id = body.customer_id || null;
    if ('assigned_to' in body) updates.assigned_to = body.assigned_to || null;
    if ('due_date' in body) updates.due_date = body.due_date || null;
    if ('priority' in body) updates.priority = body.priority;
    if ('status' in body) updates.status = body.status;
    if ('recurrence' in body) updates.recurrence = body.recurrence || null;

    const supabase = createClient();
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('PUT /api/admin/tasks/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a task
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/tasks/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
