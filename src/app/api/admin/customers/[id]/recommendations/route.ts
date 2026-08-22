import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireRole } from '@/lib/permissions';
import { generateRecommendations } from '@/lib/gemini';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'] as const;

// POST - Generate AI recommendations matching this customer against the Benefits/Partners
// catalog. Generated fresh each call, not persisted.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, [...CRM_ROLES]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const supabase = createClient();

    const [{ data: customer, error: customerError }, { data: contacts }, { data: notes }, { data: benefits }, { data: partners }] =
      await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('customer_contacts').select('full_name, title').eq('customer_id', id),
        supabase.from('customer_notes').select('note').eq('customer_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('benefits').select('id, title, description, category').eq('status', 'published'),
        supabase.from('partners').select('id, name, description, category').eq('status', 'published'),
      ]);

    if (customerError || !customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const { data: opportunities } = await supabase
      .from('customer_opportunities')
      .select('opportunity_title, deal_stage, status')
      .ilike('company_name', customer.company_name);

    if (!benefits?.length && !partners?.length) {
      return NextResponse.json({ success: true, recommendations: [] });
    }

    const context = {
      customer: {
        company_name: customer.company_name,
        industry: customer.industry,
        solutions_used: customer.solutions_used,
      },
      contacts: contacts || [],
      recent_notes: (notes || []).map((n) => n.note),
      opportunities: opportunities || [],
      benefits_catalog: benefits || [],
      partners_catalog: partners || [],
    };

    const prompt = `You are a B2B account manager assistant for a private business club. Given this customer's profile and a catalog of benefits and partners the club offers, recommend the top 5 catalog items this customer is most likely to be interested in. Ground every recommendation in specific details from the customer's profile — do not invent facts.

Customer and catalog data:
${JSON.stringify(context, null, 2)}

Return recommendations only for items present in benefits_catalog or partners_catalog, using their real "id". "type" must be "benefit" or "partner" matching which catalog the id came from. "reason" should be one sentence tying the recommendation to something specific about this customer.`;

    const recommendations = await generateRecommendations(prompt);

    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    console.error('POST /api/admin/customers/[id]/recommendations error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
