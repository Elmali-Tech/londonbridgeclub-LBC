import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string; userId: string }> };

// PUT - Update a person's commission share. Rejects if the new total would exceed 100%.
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id, userId } = await params;
    const body = await request.json();
    const share_percentage = Number(body.share_percentage);

    if (!Number.isFinite(share_percentage) || share_percentage <= 0 || share_percentage > 100) {
      return NextResponse.json({ success: false, error: 'Share must be between 0 and 100' }, { status: 400 });
    }

    const supabase = createClient();

    // Sum every OTHER person's share; the updated value must keep the total ≤ 100%.
    const { data: existing, error: sumError } = await supabase
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

    const { data, error } = await supabase
      .from('project_commission_shares')
      .update({ share_percentage, updated_at: new Date().toISOString() })
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
