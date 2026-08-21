import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin, requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

type Params = { params: Promise<{ id: string }> };

// GET - Fetch a single proposal
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { data: proposal, error } = await supabase.from('proposals').select('*').eq('id', id).single();

    if (error || !proposal) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    console.error('GET /api/admin/proposals/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a proposal
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const {
      customer_id, customer_opportunity_id, title, description,
      amount, status, sent_date, document_key, responsible_person,
    } = body;

    if (!customer_id || !title) {
      return NextResponse.json({ success: false, error: 'Customer and title are required' }, { status: 400 });
    }

    const { data: proposal, error } = await supabase
      .from('proposals')
      .update({
        customer_id,
        customer_opportunity_id: customer_opportunity_id || null,
        title,
        description: description || null,
        amount: amount || null,
        status: status || 'Draft',
        sent_date: sent_date || null,
        document_key: document_key || null,
        responsible_person: responsible_person || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating proposal:', error);
      return NextResponse.json({ success: false, error: 'Failed to update proposal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    console.error('PUT /api/admin/proposals/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a proposal
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { error } = await supabase.from('proposals').delete().eq('id', id);

    if (error) {
      console.error('Error deleting proposal:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete proposal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/proposals/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
