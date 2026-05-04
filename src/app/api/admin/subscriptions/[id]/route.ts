import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/subscriptions/[id] — plan_type veya status güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/subscriptions/[id] — Stripe'da iptal et
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await validateSession(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createClient();

  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, user_id')
    .eq('id', id)
    .single();

  if (fetchErr || !sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  if (sub.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch (err) {
      console.error('Stripe cancel error:', err);
      // Stripe'da zaten iptal edilmiş olabilir, devam et
    }
  }

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', id);

  await supabase
    .from('users')
    .update({ subscription_status: 'canceled' })
    .eq('id', sub.user_id);

  return NextResponse.json({ success: true });
}
