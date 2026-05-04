import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe';
import { validateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // JSON veriyi al
    const { token } = await req.json();

    // Token'ı doğrula ve kullanıcıyı al
    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme başarısız' }, { status: 401 });
    }

    // Kullanıcının Stripe müşteri ID'sini al
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