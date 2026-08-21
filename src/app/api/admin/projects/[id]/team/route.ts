import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// POST - Add a team member to a project
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { data: member, error } = await supabase
      .from('project_team_members')
      .insert({ project_id: id, user_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'This person is already on the team' }, { status: 400 });
      }
      console.error('Error adding team member:', error);
      return NextResponse.json({ success: false, error: 'Failed to add team member' }, { status: 500 });
    }

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/projects/[id]/team error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
