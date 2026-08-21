import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

type Params = { params: Promise<{ id: string }> };

// GET - Fetch a single partner
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('GET /api/admin/partners/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a partner
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { name, description, website_url, logo_key, category, subcategory, responsible_person } = body;

    if (!name || !description) {
      return NextResponse.json({ success: false, error: 'Name and description are required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: partner, error } = await supabase
      .from('partners')
      .update({
        name,
        description,
        website_url: website_url || null,
        logo_key: logo_key || null,
        category: category || null,
        subcategory: subcategory || null,
        responsible_person: responsible_person || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating partner:', error);
      return NextResponse.json({ success: false, error: 'Failed to update partner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('PUT /api/admin/partners/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a partner
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase.from('partners').delete().eq('id', id);

    if (error) {
      console.error('Error deleting partner:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete partner' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/partners/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
