import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { getOverdueTasks, getPendingApprovalsCount } from '@/lib/automations';

// GET - Management dashboard summary: active projects, pending approvals, pipeline value,
// win rate, upcoming meetings, and overdue tasks. Reuses automations.ts so "overdue" and
// "pending" mean the same thing here as they do in the digest emails.
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
    ]);

    const pipelineValue = (activeOpps || []).reduce((sum, o) => sum + (Number(o.estimated_deal_value) || 0), 0);
    const winRatePercent = totalOpps ? Math.round(((wonOpps || 0) / totalOpps) * 100) : 0;

    return NextResponse.json({
      success: true,
      activeProjects: activeProjects || 0,
      pendingApprovals,
      pipelineValue,
      winRatePercent,
      upcomingMeetings: upcomingMeetings || [],
      overdueTasks: { count: overdueTasksAll.length, items: overdueTasksAll.slice(0, 5) },
    });
  } catch (error) {
    console.error('GET /api/admin/dashboard/summary error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
