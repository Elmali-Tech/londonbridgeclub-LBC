import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// GET - List proposals
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    const supabase = createClient();
    let query = supabase.from('proposals').select('*').order('created_at', { ascending: false });
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: proposals, error } = await query;

    if (error) {
      console.error('Error fetching proposals:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch proposals' }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposals });
  } catch (error) {
    console.error('GET /api/admin/proposals error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new proposal
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const {
      customer_id, customer_opportunity_id, title, description,
      amount, status, sent_date, document_key, responsible_person,
    } = body;

    if (!customer_id || !title) {
      return NextResponse.json({ success: false, error: 'Customer and title are required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        customer_id,
        customer_opportunity_id: customer_opportunity_id || null,
        title,
        description: description || null,
        amount: amount || null,
        status: status || 'Draft',
        sent_date: sent_date || null,
        document_key: document_key || null,
        responsible_person: responsible_person || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating proposal:', error);
      return NextResponse.json({ success: false, error: 'Failed to create proposal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/proposals error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
