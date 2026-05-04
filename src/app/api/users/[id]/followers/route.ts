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
    const userId = parseInt(request.nextUrl.pathname.split('/')[3]); // /api/users/[id]/followers

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz kullanıcı ID' },
        { status: 400 }
      );
    }

    // Takipçileri getir - join ile ilişkiyi manuel olarak yapıyoruz
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('follower_id')
      .eq('following_id', userId);

    if (connectionsError) {
      console.error('Takipçi verileri çekilirken hata:', connectionsError);
      return NextResponse.json(
        { success: false, error: 'Takipçi verilerini getirme hatası' },
        { status: 500 }
      );
    }

    // Eğer hiç takipçi yoksa boş dizi döndür
    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        followers: []
      });
    }

    // Takipçi kullanıcı ID'lerini al
    const followerIds = connections.map(connection => connection.follower_id);

    // Takipçi kullanıcı bilgilerini getir
    const { data: followers, error: followersError } = await supabase
      .from('users')
      .select('id, full_name, headline, profile_image_key')
      .in('id', followerIds);

    if (followersError) {
      console.error('Takipçi kullanıcı verileri alınırken hata:', followersError);
      return NextResponse.json(
        { success: false, error: 'Takipçi kullanıcı verilerini getirme hatası' },
        { status: 500 }
      );
    }
    
    // İsteği yapan kullanıcının takip durumlarını kontrol et
    let isFollowingData: Record<number, boolean> = {};
    
    if (followerIds.length > 0) {
      const { data: followingStatusData } = await supabase
        .from('connections')
        .select('following_id')
        .eq('follower_id', authenticatedUser.id)
        .in('following_id', followerIds);
      
      // Takip edilen kullanıcıların ID'lerini bir kümede topla
      const followingSet = new Set((followingStatusData || []).map(item => item.following_id));
      
      // Her bir kullanıcı için takip durumunu belirle
      isFollowingData = followerIds.reduce((acc, id) => {
        acc[id] = followingSet.has(id);
        return acc;
      }, {} as Record<number, boolean>);
    }

    // Sonuçları formatla
    const formattedFollowers = followers.map(user => ({
      id: user.id,
      full_name: user.full_name,
      headline: user.headline,
      profile_image_key: user.profile_image_key,
      isFollowing: isFollowingData[user.id] || false
    }));

    return NextResponse.json({
      success: true,
      followers: formattedFollowers
    });
  } catch (error) {
    console.error('Takipçi listesi alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
} 