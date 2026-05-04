import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// POST request to like a post
export async function POST(
  request: NextRequest,
) {
  try {
    // Get post ID from the URL
    const postId = request.nextUrl.pathname.split('/')[3]; // /api/posts/[id]/comment
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID gerekli' },
        { status: 400 }
      );
    }

    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // user_id'yi text olarak kullanıyoruz
    const userId = session.id.toString();

    // Create Supabase client
    const supabase = createClient();

    // First, check if the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id, likes_count')
      .eq('id', postId)
      .single();

    if (postError) {
      return NextResponse.json(
        { success: false, error: 'Post bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının daha önce bu gönderiyi beğenip beğenmediğini kontrol et
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    // Daha önce beğenmiş mi?
    if (existingLike && !likeCheckError) {
      return NextResponse.json({
        success: false,
        error: 'Bu gönderiyi zaten beğendiniz'
      }, { status: 400 });
    }

    // RLS ile ilgili hata giderilmesi için service role kullanabiliriz
    // 1. post_likes tablosuna ekle - user_id'yi text olarak tutuyoruz
    const { error: insertError } = await supabase
      .from('post_likes')
      .insert({
        user_id: userId,
        post_id: postId,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      // RLS hata kodu kontrolü
      if (insertError.code === '42501') {
        console.error('RLS policy error:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Beğeni izni yok. RLS politikası hatası.'
        }, { status: 403 });
      }
      
      // Eğer tablo yoksa, oluşturmamız gerektiğini bildirelim
      if (insertError.code === '42P01') { // postgres table-does-not-exist hatası
        return NextResponse.json({
          success: false,
          error: 'post_likes tablosu veritabanında bulunmuyor. Önce tabloyu oluşturmanız gerekiyor.'
        }, { status: 500 });
      }
      
      console.error('Error inserting like:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni eklenirken bir hata oluştu'
      }, { status: 500 });
    }

    // 2. likes_count alanını artır
    const { error: updateError } = await supabase
      .from('posts')
      .update({ likes_count: (post.likes_count || 0) + 1 })
      .eq('id', postId);

    if (updateError) {
      // likes_count güncellenemezse, eklenen beğeniyi geri al
      await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      console.error('Error updating like count:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni sayısı güncellenirken bir hata oluştu'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post beğenildi'
    });
  } catch (error) {
    console.error('Unexpected error in post liking:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE request to unlike a post
export async function DELETE(
  request: NextRequest,
) {
  try {
    // Get post ID from the URL
    const postId = request.nextUrl.pathname.split('/')[3]; // /api/posts/[id]/comment
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID gerekli' },
        { status: 400 }
      );
    }

    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // user_id'yi text olarak kullanıyoruz
    const userId = session.id.toString();

    // Create Supabase client
    const supabase = createClient();

    // First, check if the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id, likes_count')
      .eq('id', postId)
      .single();

    if (postError) {
      return NextResponse.json(
        { success: false, error: 'Post bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının daha önce bu gönderiyi beğenip beğenmediğini kontrol et
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    // Daha önce beğenmemiş mi?
    if (!existingLike || likeCheckError) {
      return NextResponse.json({
        success: false,
        error: 'Bu gönderiyi henüz beğenmediniz'
      }, { status: 400 });
    }

    // 1. post_likes tablosundan sil
    const { error: deleteError } = await supabase
      .from('post_likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (deleteError) {
      // RLS hata kodu kontrolü
      if (deleteError.code === '42501') {
        console.error('RLS policy error:', deleteError);
        return NextResponse.json({
          success: false,
          error: 'Beğeni kaldırma izni yok. RLS politikası hatası.'
        }, { status: 403 });
      }
      
      console.error('Error deleting like:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni kaldırılırken bir hata oluştu'
      }, { status: 500 });
    }

    // 2. likes_count alanını azalt (0'ın altına düşmemesi için kontrol)
    const newLikeCount = Math.max(0, (post.likes_count || 0) - 1);
    
    const { error: updateError } = await supabase
      .from('posts')
      .update({ likes_count: newLikeCount })
      .eq('id', postId);

    if (updateError) {
      // likes_count güncellenemezse, silinen beğeniyi geri ekle
      await supabase
        .from('post_likes')
        .insert({
          user_id: userId,
          post_id: postId,
          created_at: new Date().toISOString()
        });

      console.error('Error updating like count:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni sayısı güncellenirken bir hata oluştu'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post beğenisi kaldırıldı'
    });
  } catch (error) {
    console.error('Unexpected error in post unliking:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
} 