import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';

export async function POST(
  request: NextRequest,
) {
  try {
    // Oturum doğrulama
    const authenticatedUser = await validateSession(request);
    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz veya süresi dolmuş token' },
        { status: 401 }
      );
    }

    // Supabase bağlantısı
    const supabase = createClient();

    // Takipten çıkarılacak kullanıcı ID'sini URL'den alıyoruz
    const followingId = parseInt(request.nextUrl.pathname.split('/')[3]); // /api/connections/unfollow/[id]

    if (isNaN(followingId)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz kullanıcı ID' },
        { status: 400 }
      );
    }

    // Takip ilişkisini sil
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('follower_id', authenticatedUser.id)
      .eq('following_id', followingId);

    if (error) {
      console.error('Takipten çıkma sırasında hata:', error);
      return NextResponse.json(
        { success: false, error: 'Takipten çıkma işlemi başarısız oldu' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı takibi başarıyla bırakıldı'
    });
  } catch (error) {
    console.error('Takipten çıkma sırasında beklenmeyen hata:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}
