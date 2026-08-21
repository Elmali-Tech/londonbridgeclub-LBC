import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

// GET - List all partners (any status)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partners:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch partners' }, { status: 500 });
    }

    return NextResponse.json({ success: true, partners });
  } catch (error) {
    console.error('GET /api/admin/partners error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new partner
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { name, description, website_url, logo_key, category, subcategory, responsible_person } = body;

    if (!name || !description) {
      return NextResponse.json({ success: false, error: 'Name and description are required' }, { status: 400 });
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .insert({
        name,
        description,
        website_url: website_url || null,
        logo_key: logo_key || null,
        category: category || null,
        subcategory: subcategory || null,
        responsible_person: responsible_person || null,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating partner:', error);
      return NextResponse.json({ success: false, error: 'Failed to create partner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, partner }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/partners error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
