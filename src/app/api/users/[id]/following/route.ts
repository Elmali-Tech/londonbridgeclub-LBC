import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
) {
  try {
    // Auth token kontrolü
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    // Token doğrulama
    const authenticatedUser = await validateToken(token);
    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz veya süresi dolmuş token' },
        { status: 401 }
      );
    }

    // Supabase bağlantısı
    const supabase = createClient();

    // User ID - pathname'den ID al
    const userId = parseInt(request.nextUrl.pathname.split('/')[3]); // /api/users/[id]/following

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz kullanıcı ID' },
        { status: 400 }
      );
    }

    // Takip edilen kullanıcıları getir
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('following_id')
      .eq('follower_id', userId);

    if (connectionsError) {
      console.error('Takip edilen kullanıcı verileri çekilirken hata:', connectionsError);
      return NextResponse.json(
        { success: false, error: 'Takip edilen kullanıcı verilerini getirme hatası' },
        { status: 500 }
      );
    }

    // Sonuçları formatla - ilk olarak bir boş dizi kontrol edelim
    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        following: []
      });
    }

    // Takip edilen kullanıcı ID'lerini al
    const followingIds = connections.map(connection => connection.following_id);

    // Takip edilen kullanıcı bilgilerini getir
    const { data: following, error: followingError } = await supabase
      .from('users')
      .select('id, full_name, headline, profile_image_key')
      .in('id', followingIds);

    if (followingError) {
      console.error('Takip edilen kullanıcı bilgileri alınırken hata:', followingError);
      return NextResponse.json(
        { success: false, error: 'Takip edilen kullanıcı bilgilerini getirme hatası' },
        { status: 500 }
      );
    }

    // Sonuçları formatla - kendi takip listemizde olduğu için hepsi takip ediliyor
    const formattedFollowing = following.map(user => ({
      id: user.id,
      full_name: user.full_name,
      headline: user.headline,
      profile_image_key: user.profile_image_key,
      isFollowing: true // Kullanıcı kendi takip listesini görüntülüyorsa, tüm kullanıcıları takip ediyor demektir
    }));

    return NextResponse.json({
      success: true,
      following: formattedFollowing
    });
  } catch (error) {
    console.error('Takip edilen kullanıcı listesi alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
} 