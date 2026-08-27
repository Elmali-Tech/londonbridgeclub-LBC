import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendMissingDataReportEmail } from '@/lib/nodemailer';
import { getOpportunitiesMissingData, getStaleDraftProposals } from '@/lib/automations';

function requireCronSecret(request: NextRequest): NextResponse | null {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// POST - Standalone missing data report: opportunities missing key fields, stale drafts,
// customers without a responsible person or contacts. Sent to all admins.
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient();

    const [
      missingDataOpportunities,
      staleDraftProposals,
      { data: customersNoOwner },
      { data: admins },
    ] = await Promise.all([
      getOpportunitiesMissingData(),
      getStaleDraftProposals(3),
      supabase.from('customers').select('id, company_name').is('responsible_person', null),
      supabase.from('users').select('id, email, full_name').eq('role', 'admin'),
    ]);

    // Customers with no contacts
    const { data: allCustomers } = await supabase.from('customers').select('id, company_name');
    const { data: contactRows } = await supabase.from('customer_contacts').select('customer_id');
    const customersWithContacts = new Set((contactRows || []).map((r: { customer_id: number }) => r.customer_id));
    const customersNoContacts = (allCustomers || []).filter((c) => !customersWithContacts.has(c.id));

    const reportData = {
      missingDataOpportunities: missingDataOpportunities.map((o) => ({
        company_name: o.company_name,
        opportunity_title: o.opportunity_title,
        missing: [
          ...(!o.estimated_deal_size ? ['estimated deal size'] : []),
          ...(!o.expected_closing_date ? ['closing date'] : []),
        ].join(', '),
      })),
      staleDraftProposals: staleDraftProposals.map((p) => ({ title: p.title })),
      customersNoOwner: (customersNoOwner || []).map((c) => ({ company_name: c.company_name })),
      customersNoContacts: customersNoContacts.map((c) => ({ company_name: c.company_name })),
    };

    const hasIssues =
      reportData.missingDataOpportunities.length > 0 ||
      reportData.staleDraftProposals.length > 0 ||
      reportData.customersNoOwner.length > 0 ||
      reportData.customersNoContacts.length > 0;

    if (!hasIssues) {
      return NextResponse.json({ success: true, sent: 0, message: 'No missing data issues found' });
    }

    let sent = 0;
    for (const admin of admins || []) {
      if (!admin.email) continue;
      await sendMissingDataReportEmail(admin.email, admin.full_name, reportData);
      sent++;
    }

    return NextResponse.json({ success: true, sent, issues: reportData });
  } catch (error) {
    console.error('POST /api/automations/missing-data error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
