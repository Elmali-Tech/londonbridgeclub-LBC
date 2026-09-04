import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List commission rates. `?active=true` returns only active rates
// (used to populate the project form dropdown). Readable by all CRM roles.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const activeOnly = new URL(request.url).searchParams.get('active') === 'true';

    const supabase = createClient();
    let query = supabase.from('commission_rates').select('*').order('name', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
      console.error('GET /api/admin/commission-rates error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch commission rates' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rates: data ?? [] });
  } catch (error) {
    console.error('GET /api/admin/commission-rates error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new commission rate. Admin only.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const percentage = Number(body.percentage);

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return NextResponse.json({ success: false, error: 'Percentage must be between 0 and 100' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('commission_rates')
      .insert({
        name,
        percentage,
        is_active: body.is_active ?? true,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('POST /api/admin/commission-rates error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create commission rate' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rate: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/commission-rates error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
