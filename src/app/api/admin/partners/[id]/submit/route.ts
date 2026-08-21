import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { sendSystemNotification } from '@/lib/nodemailer';

// POST - Data entry submits a draft (or a revision) for admin review
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { data: existing, error: fetchError } = await supabase
      .from('partners')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    if (existing.status !== 'draft' && existing.status !== 'revision_requested') {
      return NextResponse.json(
        { success: false, error: `Cannot submit a partner with status "${existing.status}" for review` },
        { status: 400 }
      );
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .update({
        status: 'pending_review',
        submitted_by: auth.user.id,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error submitting partner for review:', error);
      return NextResponse.json({ success: false, error: 'Failed to submit for review' }, { status: 500 });
    }

    try {
      await sendSystemNotification(
        'Partner Submitted for Review',
        `"${existing.name}" was submitted for review by ${auth.user.full_name}.`
      );
    } catch (notifyError) {
      console.error('Notification error:', notifyError);
    }

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('POST /api/admin/partners/[id]/submit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
