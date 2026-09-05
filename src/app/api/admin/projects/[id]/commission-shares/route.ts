import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { canManageProjectCommission, getCommissionScope } from '@/lib/commission';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string }> };

// GET - Commission shares for a project, scoped to what the caller may see (§7).
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();

    // Enforce read scope: managers only for their own projects, sales members
    // only their own share within the project.
    const scope = await getCommissionScope(supabase, auth.user);
    if (scope.kind === 'projects' && !scope.projectIds.includes(Number(id))) {
      return NextResponse.json({ success: true, shares: [] });
    }

    let sharesQuery = supabase
      .from('project_commission_shares')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true });
    if (scope.kind === 'self') sharesQuery = sharesQuery.eq('user_id', scope.userId);

    const { data, error } = await sharesQuery;

    if (error) {
      console.error('GET /api/admin/projects/[id]/commission-shares error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch commission shares' }, { status: 500 });
    }

    return NextResponse.json({ success: true, shares: data ?? [] });
  } catch (error) {
    console.error('GET /api/admin/projects/[id]/commission-shares error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a person's commission share. Rejects if the total would exceed 100%.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabaseAuthz = createClient();
    if (!(await canManageProjectCommission(supabaseAuthz, auth.user, id))) {
      return NextResponse.json({ success: false, error: 'You do not have permission to manage this project’s commission' }, { status: 403 });
    }

    const body = await request.json();
    const user_id = Number(body.user_id);
    const share_percentage = Number(body.share_percentage);
    const due_date = body.due_date ? String(body.due_date) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return NextResponse.json({ success: false, error: 'A valid person is required' }, { status: 400 });
    }
    if (!Number.isFinite(share_percentage) || share_percentage <= 0 || share_percentage > 100) {
      return NextResponse.json({ success: false, error: 'Share must be between 0 and 100' }, { status: 400 });
    }

    const supabase = createClient();

    // Sum existing shares and reject if adding this one would exceed 100%.
    const { data: existing, error: sumError } = await supabase
      .from('project_commission_shares')
      .select('share_percentage')
      .eq('project_id', id);
    if (sumError) {
      console.error('Error reading existing shares:', sumError);
      return NextResponse.json({ success: false, error: 'Failed to add commission share' }, { status: 500 });
    }
    const currentTotal = (existing ?? []).reduce((sum, r) => sum + Number(r.share_percentage), 0);
    if (currentTotal + share_percentage > 100.0001) {
      const remaining = Math.max(0, Math.round((100 - currentTotal) * 100) / 100);
      return NextResponse.json(
        { success: false, error: `Total commission share cannot exceed 100%. Only ${remaining}% remaining.` },
        { status: 400 },
      );
    }

    const { data: member, error } = await supabase
      .from('project_commission_shares')
      .insert({ project_id: id, user_id, share_percentage, due_date, notes })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'This person already has a commission share' }, { status: 400 });
      }
      console.error('Error adding commission share:', error);
      return NextResponse.json({ success: false, error: 'Failed to add commission share' }, { status: 500 });
    }

    return NextResponse.json({ success: true, share: member }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/projects/[id]/commission-shares error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
