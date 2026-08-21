import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/permissions';

// POST - Admin archives a published benefit, taking it off the live listing
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data: existing, error: fetchError } = await supabase
      .from('benefits')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Benefit not found' }, { status: 404 });
    }

    if (existing.status !== 'published') {
      return NextResponse.json(
        { success: false, error: `Cannot archive a benefit with status "${existing.status}"` },
        { status: 400 }
      );
    }

    const { data: benefit, error } = await supabase
      .from('benefits')
      .update({ status: 'archived', is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving benefit:', error);
      return NextResponse.json({ success: false, error: 'Failed to archive benefit' }, { status: 500 });
    }

    return NextResponse.json({ success: true, benefit });
  } catch (error) {
    console.error('POST /api/admin/benefits/[id]/archive error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
