import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// DELETE - Remove a team member from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id, userId } = await params;
    const supabase = createClient();
    const { error } = await supabase
      .from('project_team_members')
      .delete()
      .eq('project_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing team member:', error);
      return NextResponse.json({ success: false, error: 'Failed to remove team member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/projects/[id]/team/[userId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
