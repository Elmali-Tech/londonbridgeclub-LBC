import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendMonthlyKpiReportEmail } from '@/lib/nodemailer';
import { getPendingApprovalsCount } from '@/lib/automations';

function requireCronSecret(request: NextRequest): NextResponse | null {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// Numeric columns come back from Supabase as strings; coerce safely.
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// POST - Standalone monthly KPI report: project financials, pipeline health, and completion metrics.
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient();
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);

    const [
      { data: allProjects },
      { count: totalOpps },
      { count: wonOpps },
      { count: activeOpps },
      pendingApprovals,
      { data: newProjects },
      { data: completedProjects },
      { data: admins },
    ] = await Promise.all([
      supabase.from('projects').select('status, revenue, commission_amount'),
      supabase.from('customer_opportunities').select('id', { count: 'exact', head: true }),
      supabase.from('customer_opportunities').select('id', { count: 'exact', head: true }).eq('status', 'Won'),
      supabase.from('customer_opportunities').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      getPendingApprovalsCount(),
      supabase.from('projects').select('name, status').gte('created_at', monthStart.toISOString()),
      supabase.from('projects').select('name, revenue, commission_amount').eq('status', 'Completed').gte('updated_at', monthStart.toISOString()),
      supabase.from('users').select('id, email, full_name').eq('role', 'admin'),
    ]);

    const projects = allProjects || [];
    const totalRevenue = projects.reduce((sum, p) => sum + num(p.revenue), 0);
    const totalCommission = projects.reduce((sum, p) => sum + num(p.commission_amount), 0);
    const completionRate = projects.length
      ? Math.round((projects.filter((p) => p.status === 'Completed').length / projects.length) * 100)
      : 0;
    const winRate = totalOpps ? Math.round(((wonOpps || 0) / totalOpps) * 100) : 0;

    const reportData = {
      totalRevenue,
      totalCommission,
      completionRate,
      winRate,
      totalProjects: projects.length,
      activeOpportunities: activeOpps || 0,
      pendingApprovals,
      newProjectsThisMonth: (newProjects || []).map((p) => ({ name: p.name, status: p.status })),
      completedProjectsThisMonth: (completedProjects || []).map((p) => ({
        name: p.name,
        revenue: p.revenue != null ? `£${num(p.revenue).toLocaleString('en-GB')}` : null,
        commission: p.commission_amount != null ? `£${num(p.commission_amount).toLocaleString('en-GB')}` : null,
      })),
    };

    let sent = 0;
    for (const admin of admins || []) {
      if (!admin.email) continue;
      await sendMonthlyKpiReportEmail(admin.email, admin.full_name, reportData);
      sent++;
    }

    return NextResponse.json({ success: true, sent, report: reportData });
  } catch (error) {
    console.error('POST /api/automations/monthly-kpi error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
