import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/permissions';
import { submitForReview } from '@/lib/reviewWorkflow';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;
const CONFIG = { table: 'proposals', entityLabel: 'proposal', labelField: 'title' };

// POST - Submit a draft (or revision) proposal for review before it can be sent
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const result = await submitForReview(CONFIG, id, auth.user.id, auth.user.full_name);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, proposal: result.data });
  } catch (error) {
    console.error('POST /api/admin/proposals/[id]/submit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
