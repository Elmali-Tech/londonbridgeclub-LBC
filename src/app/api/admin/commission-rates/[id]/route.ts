import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/permissions';

type Params = { params: Promise<{ id: string }> };

// PUT - Edit a commission rate, and/or toggle its active state. Admin only.
// Deactivation is done here by sending { is_active: false } — rates are never deleted.
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
      }
      update.name = name;
    }

    if (body.percentage !== undefined) {
      const percentage = Number(body.percentage);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return NextResponse.json({ success: false, error: 'Percentage must be between 0 and 100' }, { status: 400 });
      }
      update.percentage = percentage;
    }

    if (body.is_active !== undefined) {
      update.is_active = !!body.is_active;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('commission_rates')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('PUT /api/admin/commission-rates/[id] error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update commission rate' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ success: false, error: 'Commission rate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rate: data });
  } catch (error) {
    console.error('PUT /api/admin/commission-rates/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
