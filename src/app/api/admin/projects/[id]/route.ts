import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string }> };

// GET - Full project detail: the project, its team members, and its tasks
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();

    const [{ data: project, error: projectError }, { data: team }, { data: tasks }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('project_team_members').select('*').eq('project_id', id).order('added_at', { ascending: true }),
      supabase.from('tasks').select('*').eq('project_id', id).order('due_date', { ascending: true }),
    ]);

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project, team: team || [], tasks: tasks || [] });
  } catch (error) {
    console.error('GET /api/admin/projects/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a project
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const {
      customer_id, customer_opportunity_id, name, description, owner_id,
      status, progress_percentage, start_date, end_date, revenue, commission, risks,
    } = body;

    if (!customer_id || !name) {
      return NextResponse.json({ success: false, error: 'Customer and project name are required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: project, error } = await supabase
      .from('projects')
      .update({
        customer_id,
        customer_opportunity_id: customer_opportunity_id || null,
        name,
        description: description || null,
        owner_id: owner_id || null,
        status: status || 'Planning',
        progress_percentage: progress_percentage ?? 0,
        start_date: start_date || null,
        end_date: end_date || null,
        revenue: revenue || null,
        commission: commission || null,
        risks: risks || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('PUT /api/admin/projects/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a project (cascades to team members and tasks)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/projects/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
