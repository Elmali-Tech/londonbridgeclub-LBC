import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/permissions';
import { sendReviewDecisionEmail, sendSystemNotification } from '@/lib/nodemailer';

// POST - Admin sends a pending partner back for revision, with notes
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { notes } = await request.json();
    if (!notes || !notes.trim()) {
      return NextResponse.json({ success: false, error: 'Revision notes are required' }, { status: 400 });
    }

    const { id } = await params;
    const supabase = createClient();
    const { data: existing, error: fetchError } = await supabase
      .from('partners')
      .select('id, name, status, submitted_by')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    if (existing.status !== 'pending_review') {
      return NextResponse.json(
        { success: false, error: `Cannot request revision on a partner with status "${existing.status}"` },
        { status: 400 }
      );
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .update({
        status: 'revision_requested',
        revision_notes: notes,
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error requesting revision:', error);
      return NextResponse.json({ success: false, error: 'Failed to request revision' }, { status: 500 });
    }

    try {
      if (existing.submitted_by) {
        const { data: submitter } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', existing.submitted_by)
          .single();

        if (submitter?.email) {
          await sendReviewDecisionEmail(submitter.email, submitter.full_name, 'revision_requested', notes);
        }
      }

      await sendSystemNotification(
        'Partner Revision Requested',
        `"${existing.name}" was sent back for revision by ${auth.user.full_name}: ${notes}`
      );
    } catch (notifyError) {
      console.error('Notification error:', notifyError);
    }

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('POST /api/admin/partners/[id]/request-revision error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
