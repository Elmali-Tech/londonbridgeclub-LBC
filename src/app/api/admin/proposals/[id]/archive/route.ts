import { NextRequest, NextResponse } from 'next/server';
import { requireCanPublish } from '@/lib/permissions';
import { archiveRecord } from '@/lib/reviewWorkflow';

const CONFIG = { table: 'proposals', entityLabel: 'proposal', labelField: 'title' };

// POST - Archive a published proposal
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCanPublish(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const result = await archiveRecord(CONFIG, id);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, proposal: result.data });
  } catch (error) {
    console.error('POST /api/admin/proposals/[id]/archive error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
