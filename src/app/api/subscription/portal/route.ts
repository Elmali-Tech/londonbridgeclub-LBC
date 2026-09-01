import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await validateSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme başarısız' }, { status: 401 });
    }

    // Kullanıcının Stripe müşteri ID'sini al
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (error || !data || !data.stripe_customer_id) {
      return NextResponse.json({ error: 'Stripe müşteri ID bulunamadı' }, { status: 404 });
    }

    // Stripe müşteri portalı oturumu oluştur
    const portalUrl = await createPortalSession(data.stripe_customer_id);
    
    if (!portalUrl) {
      return NextResponse.json({ error: 'Portal oturumu oluşturulamadı' }, { status: 500 });
    }

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'İşlem sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
