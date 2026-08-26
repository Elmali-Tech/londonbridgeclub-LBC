import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/permissions';
import { createClient } from '@/lib/supabase';

// Member-facing resource library — returns admin-published posts as resources.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'opportunity_manager', 'sales_member', 'viewer']);
  if (auth.response) return auth.response;

  const supabase = createClient();
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, category, is_pinned, created_at, user_id')
    .eq('is_admin_post', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/resources error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch resources' }, { status: 500 });
  }

  return NextResponse.json({ success: true, resources: posts ?? [] });
}
