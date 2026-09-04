import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { getOverdueTasks, getPendingApprovalsCount } from '@/lib/automations';

// Numeric columns come back from Supabase as strings (e.g. "50000.00"); coerce safely.
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// GET - Management dashboard summary: active projects, pending approvals, pipeline value,
// win rate, upcoming meetings, overdue tasks, and project revenue/commission aggregates.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);

    const [
      { count: activeProjects },
      pendingApprovals,
      { data: activeOpps },
      { count: totalOpps },
      { count: wonOpps },
      { data: upcomingMeetings },
      overdueTasksAll,
      { data: projectFinancials },
      { count: completedProjects },
      { data: shareRows },
      usersResult,
    ] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      getPendingApprovalsCount(),
      // GBP only — opportunities carry mixed currencies (currency_code), and summing across
      // currencies into one figure would misrepresent the total.
      supabase.from('customer_opportunities').select('estimated_deal_value').eq('status', 'Active').eq('currency_code', 'GBP'),
      supabase.from('customer_opportunities').select('id', { count: 'exact', head: true }),
      supabase.from('customer_opportunities').select('id', { count: 'exact', head: true }).eq('status', 'Won'),
      supabase.from('meetings').select('*').gte('meeting_date', today).order('meeting_date', { ascending: true }).limit(5),
      getOverdueTasks(),
      supabase.from('projects').select('id, revenue, commission_amount'),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
      supabase.from('project_commission_shares').select('user_id, share_percentage, status, created_at, project_id'),
      supabase.from('users').select('id, full_name'),
    ]);

    const pipelineValue = (activeOpps || []).reduce((sum, o) => sum + (Number(o.estimated_deal_value) || 0), 0);
    const winRatePercent = totalOpps ? Math.round(((wonOpps || 0) / totalOpps) * 100) : 0;

    const projects = projectFinancials || [];
    const totalRevenue = projects.reduce((sum, p) => sum + num(p.revenue), 0);
    // Total project commission = sum of each project's computed commission amount.
    const totalCommission = projects.reduce((sum, p) => sum + num(p.commission_amount), 0);
    const totalProjects = projects.length;
    const kpiAchievementRate = totalProjects
      ? Math.round(((completedProjects || 0) / totalProjects) * 100)
      : 0;

    // Person-based commission: each share's £ = share% × its project's commission amount.
    const projectCommissionById = new Map<number, number>();
    projects.forEach((p) => projectCommissionById.set(Number(p.id), num(p.commission_amount)));
    const userNameById = new Map<number, string>();
    (usersResult.data || []).forEach((u: { id: number; full_name: string }) => userNameById.set(Number(u.id), u.full_name));

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let pendingCommission = 0;
    let approvedCommission = 0;
    let paidCommission = 0;
    let thisMonthCommission = 0;
    const perPerson = new Map<number, number>();

    (shareRows || []).forEach((s: { user_id: number; share_percentage: number; status: string; created_at: string; project_id: number }) => {
      const projectCommission = projectCommissionById.get(Number(s.project_id)) || 0;
      const amount = Math.round(projectCommission * num(s.share_percentage)) / 100; // × (share%/100)
      if (s.status === 'Approved') approvedCommission += amount;
      else if (s.status === 'Paid') paidCommission += amount;
      else pendingCommission += amount;
      if (typeof s.created_at === 'string' && s.created_at.slice(0, 7) === monthKey) thisMonthCommission += amount;
      perPerson.set(Number(s.user_id), (perPerson.get(Number(s.user_id)) || 0) + amount);
    });

    const personCommission = Array.from(perPerson.entries())
      .map(([userId, amount]) => ({ user_id: userId, name: userNameById.get(userId) || `User #${userId}`, amount }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      activeProjects: activeProjects || 0,
      pendingApprovals,
      pipelineValue,
      winRatePercent,
      upcomingMeetings: upcomingMeetings || [],
      overdueTasks: { count: overdueTasksAll.length, items: overdueTasksAll.slice(0, 5) },
      totalRevenue,
      totalCommission,
      pendingCommission,
      approvedCommission,
      paidCommission,
      thisMonthCommission,
      personCommission,
      kpiAchievementRate,
    });
  } catch (error) {
    console.error('GET /api/admin/dashboard/summary error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
