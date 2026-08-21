import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { sendSystemNotification } from '@/lib/nodemailer';

// POST - Data entry submits a draft (or a revision) for admin review
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data: existing, error: fetchError } = await supabase
      .from('benefits')
      .select('id, title, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Benefit not found' }, { status: 404 });
    }

    if (existing.status !== 'draft' && existing.status !== 'revision_requested') {
      return NextResponse.json(
        { success: false, error: `Cannot submit a benefit with status "${existing.status}" for review` },
        { status: 400 }
      );
    }

    const { data: benefit, error } = await supabase
      .from('benefits')
      .update({
        status: 'pending_review',
        submitted_by: auth.user.id,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error submitting benefit for review:', error);
      return NextResponse.json({ success: false, error: 'Failed to submit for review' }, { status: 500 });
    }

    try {
      await sendSystemNotification(
        'Benefit Submitted for Review',
        `"${existing.title}" was submitted for review by ${auth.user.full_name}.`
      );
    } catch (notifyError) {
      console.error('Notification error:', notifyError);
    }

    return NextResponse.json({ success: true, benefit });
  } catch (error) {
    console.error('POST /api/admin/benefits/[id]/submit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
