import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendOpportunitySuggestionsEmail } from '@/lib/nodemailer';

function requireCronSecret(request: NextRequest): NextResponse | null {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// POST - AI-powered opportunity suggestions: scan all active customers against the
// published benefits/partners catalog using Gemini and email a ranked suggestion list to admins.
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient();

    const [{ data: customers }, { data: benefits }, { data: partners }, { data: admins }] = await Promise.all([
      supabase.from('customers').select('id, company_name, industry, solutions_used').limit(20),
      supabase.from('benefits').select('id, title, description, category').eq('status', 'published'),
      supabase.from('partners').select('id, name, description, category').eq('status', 'published'),
      supabase.from('users').select('id, email, full_name').eq('role', 'admin'),
    ]);

    if (!customers?.length || (!benefits?.length && !partners?.length)) {
      return NextResponse.json({ success: true, sent: 0, message: 'No data to process' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a B2B account manager assistant for the London Bridge Club. Review the list of customers and the catalog of benefits and partners below. For each customer, identify the top 2 catalog items they are most likely to value. Return a JSON array of objects: { customer_id, company_name, suggestions: [{ type, id, name, reason }] }.

Data:
${JSON.stringify({ customers, benefits_catalog: benefits || [], partners_catalog: partners || [] }, null, 2)}

Rules: only use real ids from the catalogs. type must be "benefit" or "partner". reason must be one sentence referencing the customer's profile.`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                customer_id: { type: 'INTEGER' },
                company_name: { type: 'STRING' },
                suggestions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      type: { type: 'STRING', enum: ['benefit', 'partner'] },
                      id: { type: 'INTEGER' },
                      name: { type: 'STRING' },
                      reason: { type: 'STRING' },
                    },
                    required: ['type', 'id', 'name', 'reason'],
                  },
                },
              },
              required: ['customer_id', 'company_name', 'suggestions'],
            },
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errorBody = await geminiRes.text();
      console.error('Gemini error:', errorBody);
      return NextResponse.json({ success: false, error: 'Gemini API error' }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return NextResponse.json({ success: false, error: 'Gemini returned no content' }, { status: 500 });

    let suggestions: Array<{ customer_id: number; company_name: string; suggestions: Array<{ type: string; id: number; name: string; reason: string }> }>;
    try {
      suggestions = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, error: 'Gemini returned malformed JSON' }, { status: 500 });
    }

    let sent = 0;
    for (const admin of admins || []) {
      if (!admin.email) continue;
      await sendOpportunitySuggestionsEmail(admin.email, admin.full_name, suggestions);
      sent++;
    }

    return NextResponse.json({ success: true, sent, customerCount: suggestions.length });
  } catch (error) {
    console.error('POST /api/automations/suggestions error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
