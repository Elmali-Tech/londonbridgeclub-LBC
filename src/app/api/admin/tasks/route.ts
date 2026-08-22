import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List tasks, optionally filtered by project, assignee, or status
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const assignedTo = searchParams.get('assigned_to');
    const status = searchParams.get('status');

    const supabase = createClient();
    let query = supabase.from('tasks').select('*').order('due_date', { ascending: true });
    if (projectId) query = query.eq('project_id', projectId);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (status) query = query.eq('status', status);

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('GET /api/admin/tasks error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { title, description, project_id, customer_id, customer_opportunity_id, assigned_to, due_date, priority, status, recurrence } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description || null,
        project_id: project_id || null,
        customer_id: customer_id || null,
        customer_opportunity_id: customer_opportunity_id || null,
        assigned_to: assigned_to || null,
        due_date: due_date || null,
        priority: priority || 'Medium',
        status: status || 'To Do',
        recurrence: recurrence || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/tasks error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
