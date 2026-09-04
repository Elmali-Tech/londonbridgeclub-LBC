import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;
const STATUSES = ['Pending', 'Approved', 'Paid'] as const;

type Params = { params: Promise<{ id: string; userId: string }> };

// PUT - Partially update a person's commission share: share %, status, due date, notes.
// Any subset of fields may be sent. Changing the share % still enforces the ≤100% cap.
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id, userId } = await params;
    const body = await request.json();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Share percentage (optional) — re-validate the 100% cap when it changes.
    if (body.share_percentage !== undefined) {
      const share_percentage = Number(body.share_percentage);
      if (!Number.isFinite(share_percentage) || share_percentage <= 0 || share_percentage > 100) {
        return NextResponse.json({ success: false, error: 'Share must be between 0 and 100' }, { status: 400 });
      }

      const supabaseCheck = createClient();
      const { data: existing, error: sumError } = await supabaseCheck
        .from('project_commission_shares')
        .select('user_id, share_percentage')
        .eq('project_id', id);
      if (sumError) {
        console.error('Error reading existing shares:', sumError);
        return NextResponse.json({ success: false, error: 'Failed to update commission share' }, { status: 500 });
      }
      const othersTotal = (existing ?? [])
        .filter((r) => Number(r.user_id) !== Number(userId))
        .reduce((sum, r) => sum + Number(r.share_percentage), 0);
      if (othersTotal + share_percentage > 100.0001) {
        const remaining = Math.max(0, Math.round((100 - othersTotal) * 100) / 100);
        return NextResponse.json(
          { success: false, error: `Total commission share cannot exceed 100%. Max for this person is ${remaining}%.` },
          { status: 400 },
        );
      }
      update.share_percentage = share_percentage;
    }

    // Status (optional). Marking Paid stamps paid_date (today unless one is supplied);
    // moving away from Paid clears it.
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      update.status = body.status;
      if (body.status === 'Paid') {
        update.paid_date = body.paid_date ? String(body.paid_date) : new Date().toISOString().slice(0, 10);
      } else {
        update.paid_date = null;
      }
    } else if (body.paid_date !== undefined) {
      update.paid_date = body.paid_date ? String(body.paid_date) : null;
    }

    if (body.due_date !== undefined) update.due_date = body.due_date ? String(body.due_date) : null;
    if (body.notes !== undefined) update.notes = body.notes ? String(body.notes) : null;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_commission_shares')
      .update(update)
      .eq('project_id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating commission share:', error);
      return NextResponse.json({ success: false, error: 'Failed to update commission share' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ success: false, error: 'Commission share not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, share: data });
  } catch (error) {
    console.error('PUT /api/admin/projects/[id]/commission-shares/[userId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a person's commission share.
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id, userId } = await params;
    const supabase = createClient();
    const { error } = await supabase
      .from('project_commission_shares')
      .delete()
      .eq('project_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing commission share:', error);
      return NextResponse.json({ success: false, error: 'Failed to remove commission share' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/projects/[id]/commission-shares/[userId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
