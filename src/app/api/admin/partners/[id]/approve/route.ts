import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/permissions';
import { sendReviewDecisionEmail, sendSystemNotification } from '@/lib/nodemailer';

// POST - Admin approves a pending partner, publishing it immediately
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
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
        { success: false, error: `Cannot approve a partner with status "${existing.status}"` },
        { status: 400 }
      );
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .update({
        status: 'published',
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving partner:', error);
      return NextResponse.json({ success: false, error: 'Failed to approve partner' }, { status: 500 });
    }

    try {
      if (existing.submitted_by) {
        const { data: submitter } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', existing.submitted_by)
          .single();

        if (submitter?.email) {
          await sendReviewDecisionEmail(submitter.email, submitter.full_name, 'approved');
        }
      }

      await sendSystemNotification(
        'Partner Approved & Published',
        `"${existing.name}" was approved and published by ${auth.user.full_name}.`
      );
    } catch (notifyError) {
      console.error('Notification error:', notifyError);
    }

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('POST /api/admin/partners/[id]/approve error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
