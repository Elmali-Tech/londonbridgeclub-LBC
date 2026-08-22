import { NextRequest, NextResponse } from 'next/server';
import { requireCanPublish } from '@/lib/permissions';
import { requestRevision } from '@/lib/reviewWorkflow';

const CONFIG = { table: 'proposals', entityLabel: 'proposal', labelField: 'title' };

// POST - Send a pending proposal back for revision, with notes
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCanPublish(request);
    if (auth.response) return auth.response;

    const { notes } = await request.json();
    const { id } = await params;
    const result = await requestRevision(CONFIG, id, auth.user.id, auth.user.full_name, notes);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, proposal: result.data });
  } catch (error) {
    console.error('POST /api/admin/proposals/[id]/request-revision error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
