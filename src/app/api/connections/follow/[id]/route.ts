import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateToken } from '@/lib/auth';

export async function POST(
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

    // URL'yi ve ID'yi loglama
    const pathParts = request.nextUrl.pathname.split('/');

    // Takip edilecek kullanıcı ID'sini URL'den alıyoruz
    const followingId = parseInt(pathParts[3]); // /api/connections/follow/[id]

    // Kendi kendini takip etmeyi engelle
    if (followingId === authenticatedUser.id) {
      return NextResponse.json(
        { success: false, error: 'Kendinizi takip edemezsiniz' },
        { status: 400 }
      );
    }

    // Supabase bağlantısı
    const supabase = createClient();

    // İlk olarak kullanıcı bilgisini debug için getir
    const { data: debugUserData, error: debugUserError } = await supabase
      .from('users')
      .select('*');
    
    if (debugUserError) {
      console.error('Tüm kullanıcıları getirirken hata:', debugUserError);
    }

    // Takip edilen kullanıcının var olup olmadığını kontrol et
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', followingId)
      .single();

    if (userError) {
      console.error('Kullanıcı kontrolü hatası:', userError);
      return NextResponse.json(
        { success: false, error: 'Takip edilecek kullanıcı bulunamadı', details: userError },
        { status: 404 }
      );
    }

    if (!userExists) {
      return NextResponse.json(
        { success: false, error: 'Takip edilecek kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Mevcut takip durumunu kontrol et
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('follower_id', authenticatedUser.id)
      .eq('following_id', followingId)
      .single();

    if (existingConnection) {
      return NextResponse.json(
        { success: true, message: 'Bu kullanıcıyı zaten takip ediyorsunuz' }
      );
    }

    // Takip ilişkisi oluştur
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert([
        {
          follower_id: authenticatedUser.id,
          following_id: followingId,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (connectionError) {
      console.error('Takip ilişkisi oluşturulurken hata:', connectionError);
      return NextResponse.json(
        { success: false, error: 'Takip ilişkisi oluşturulamadı', details: connectionError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla takip edildi',
      connection: connection[0]
    });
  } catch (error) {
    console.error('Takip işlemi sırasında beklenmeyen hata:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 