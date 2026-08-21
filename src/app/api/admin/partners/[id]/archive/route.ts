import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/permissions';

// POST - Admin archives a published partner, taking it off the live listing
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data: existing, error: fetchError } = await supabase
      .from('partners')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    if (existing.status !== 'published') {
      return NextResponse.json(
        { success: false, error: `Cannot archive a partner with status "${existing.status}"` },
        { status: 400 }
      );
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving partner:', error);
      return NextResponse.json({ success: false, error: 'Failed to archive partner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('POST /api/admin/partners/[id]/archive error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
