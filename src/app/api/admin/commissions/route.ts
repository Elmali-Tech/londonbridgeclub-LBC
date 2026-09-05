import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { getCommissionScope } from '@/lib/commission';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// GET - Individual commissions across all projects, enriched with project + person
// names and each person's £ amount. Supports filtering by status, project, person,
// and a created-at date range.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const sp = new URL(request.url).searchParams;
    const status = sp.get('status');
    const projectId = sp.get('project_id');
    const userId = sp.get('user_id');
    const from = sp.get('from');
    const to = sp.get('to');

    const supabase = createClient();

    // §7: restrict the rows this caller is allowed to see before any other filter.
    const scope = await getCommissionScope(supabase, auth.user);
    if (scope.kind === 'projects' && scope.projectIds.length === 0) {
      return NextResponse.json({ success: true, commissions: [] });
    }

    let query = supabase.from('project_commission_shares').select('*').order('created_at', { ascending: false });
    if (scope.kind === 'projects') query = query.in('project_id', scope.projectIds);
    if (scope.kind === 'self') query = query.eq('user_id', scope.userId);
    if (status) query = query.eq('status', status);
    if (projectId) query = query.eq('project_id', Number(projectId));
    if (userId) query = query.eq('user_id', Number(userId));
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`);

    const { data: shares, error } = await query;
    if (error) {
      console.error('GET /api/admin/commissions error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch commissions' }, { status: 500 });
    }

    const rows = shares ?? [];
    const projectIds = [...new Set(rows.map((r) => Number(r.project_id)))];
    const userIds = [...new Set(rows.map((r) => Number(r.user_id)))];

    // Bulk-fetch the referenced projects (and their customers) and users.
    const [{ data: projects }, { data: users }] = await Promise.all([
      projectIds.length
        ? supabase.from('projects').select('id, name, commission_amount, customer_id').in('id', projectIds)
        : Promise.resolve({ data: [] as { id: number; name: string; commission_amount: number | null; customer_id: number }[] }),
      userIds.length
        ? supabase.from('users').select('id, full_name').in('id', userIds)
        : Promise.resolve({ data: [] as { id: number; full_name: string }[] }),
    ]);

    const customerIds = [...new Set((projects || []).map((p) => Number(p.customer_id)).filter(Boolean))];
    const { data: customers } = customerIds.length
      ? await supabase.from('customers').select('id, company_name').in('id', customerIds)
      : { data: [] as { id: number; company_name: string }[] };

    const projectById = new Map((projects || []).map((p) => [Number(p.id), p]));
    const userById = new Map((users || []).map((u) => [Number(u.id), u.full_name]));
    const customerById = new Map((customers || []).map((c) => [Number(c.id), c.company_name]));

    const commissions = rows.map((r) => {
      const project = projectById.get(Number(r.project_id));
      const projectCommission = project ? num(project.commission_amount) : 0;
      const amount = Math.round(projectCommission * num(r.share_percentage)) / 100;
      return {
        id: r.id,
        project_id: r.project_id,
        project_name: project?.name || `Project #${r.project_id}`,
        customer_name: project ? customerById.get(Number(project.customer_id)) || '' : '',
        user_id: r.user_id,
        user_name: userById.get(Number(r.user_id)) || `User #${r.user_id}`,
        share_percentage: num(r.share_percentage),
        project_commission_amount: projectCommission,
        amount,
        status: r.status,
        due_date: r.due_date,
        paid_date: r.paid_date,
        notes: r.notes,
        created_at: r.created_at,
      };
    });

    return NextResponse.json({ success: true, commissions });
  } catch (error) {
    console.error('GET /api/admin/commissions error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
