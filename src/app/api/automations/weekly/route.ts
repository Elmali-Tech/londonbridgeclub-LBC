import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendWeeklyReportEmail } from '@/lib/nodemailer';
import { getOpportunitiesMissingData, getPendingApprovalsCount, getStaleDraftProposals } from '@/lib/automations';

function requireCronSecret(request: NextRequest): NextResponse | null {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// POST - Send admins a summary report: pending approvals, stale draft proposals, opportunities
// missing key data, and this period's new/won opportunities. ?period=monthly widens the
// aggregation window from the default week to the current month, reusing the same logic.
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const period: 'week' | 'month' = searchParams.get('period') === 'monthly' ? 'month' : 'week';

    const periodStart = new Date();
    if (period === 'month') {
      periodStart.setDate(periodStart.getDate() - 30);
    } else {
      periodStart.setDate(periodStart.getDate() - 7);
    }

    const supabase = createClient();
    const [pendingApprovals, staleDraftProposals, missingDataOpportunities, newOpps, wonOpps, admins] = await Promise.all([
      getPendingApprovalsCount(),
      getStaleDraftProposals(),
      getOpportunitiesMissingData(),
      supabase.from('customer_opportunities').select('id', { count: 'exact', head: true }).gte('created_at', periodStart.toISOString()),
      supabase
        .from('customer_opportunities')
        .select('company_name, opportunity_title')
        .eq('status', 'Won')
        .gte('updated_at', periodStart.toISOString()),
      supabase.from('users').select('id, email, full_name').eq('role', 'admin'),
    ]);

    const reportData = {
      period,
      pendingApprovals,
      staleDraftProposals: staleDraftProposals.map((p) => ({ title: p.title })),
      missingDataOpportunities: missingDataOpportunities.map((o) => ({ company_name: o.company_name, opportunity_title: o.opportunity_title })),
      newOpportunitiesCount: newOpps.count || 0,
      wonDeals: wonOpps.data || [],
    };

    let sent = 0;
    for (const admin of admins.data || []) {
      if (!admin.email) continue;
      await sendWeeklyReportEmail(admin.email, admin.full_name, reportData);
      sent++;
    }

    return NextResponse.json({ success: true, sent, period });
  } catch (error) {
    console.error('POST /api/automations/weekly error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
