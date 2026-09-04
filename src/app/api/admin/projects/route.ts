import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { resolveCommissionFields } from '@/lib/commission';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List all projects, with a team member count for each
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const supabase = createClient();
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 500 });
    }

    const { data: teamRows } = await supabase.from('project_team_members').select('project_id');
    const teamCounts = new Map<number, number>();
    (teamRows || []).forEach((row: { project_id: number }) => {
      teamCounts.set(row.project_id, (teamCounts.get(row.project_id) || 0) + 1);
    });

    const enriched = (projects || []).map((project) => ({
      ...project,
      team_count: teamCounts.get(project.id) || 0,
    }));

    return NextResponse.json({ success: true, projects: enriched });
  } catch (error) {
    console.error('GET /api/admin/projects error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const {
      customer_id, customer_opportunity_id, name, description, owner_id,
      status, progress_percentage, start_date, end_date, risks,
    } = body;

    if (!customer_id || !name) {
      return NextResponse.json({ success: false, error: 'Customer and project name are required' }, { status: 400 });
    }

    const supabase = createClient();
    const commissionFields = await resolveCommissionFields(supabase, body);

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        customer_id,
        customer_opportunity_id: customer_opportunity_id || null,
        name,
        description: description || null,
        owner_id: owner_id || null,
        status: status || 'Planning',
        progress_percentage: progress_percentage ?? 0,
        start_date: start_date || null,
        end_date: end_date || null,
        ...commissionFields,
        risks: risks || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
    }

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/projects error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
