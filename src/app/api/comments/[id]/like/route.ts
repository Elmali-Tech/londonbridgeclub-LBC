import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// POST request - Yorum beğenme
export async function POST(
  request: NextRequest,
) {
  try {
    // Get comment ID from the URL
    const commentId = request.nextUrl.pathname.split('/')[3]; // /api/comments/[id]/like
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Yorum ID gerekli' },
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

    // First, check if the comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single();

    if (commentError) {
      return NextResponse.json(
        { success: false, error: 'Yorum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının daha önce yorumu beğenip beğenmediğini kontrol et
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .single();

    // Daha önce beğenmiş mi?
    if (existingLike && !likeCheckError) {
      return NextResponse.json({
        success: false,
        error: 'Bu yorumu zaten beğendiniz'
      }, { status: 400 });
    }

    // 1. comment_likes tablosuna ekle
    const { error: insertError } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: userId,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting comment like:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni eklenirken bir hata oluştu'
      }, { status: 500 });
    }

    // 2. likes_count alanını artır
    const { error: updateError } = await supabase
      .from('comments')
      .update({ likes_count: (comment.likes_count || 0) + 1 })
      .eq('id', commentId);

    if (updateError) {
      // likes_count güncellenemezse, eklenen beğeniyi geri al
      await supabase
        .from('comment_likes')
        .delete()
        .eq('user_id', userId)
        .eq('comment_id', commentId);

      console.error('Error updating comment like count:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni sayısı güncellenirken bir hata oluştu'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Yorum beğenildi'
    });
  } catch (error) {
    console.error('Unexpected error in comment liking:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE request - Yorum beğenisini kaldırma
export async function DELETE(
  request: NextRequest,
) {
  try {
    // Get comment ID from the URL
    const commentId = request.nextUrl.pathname.split('/')[3]; // /api/comments/[id]/like
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Yorum ID gerekli' },
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

    // First, check if the comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single();

    if (commentError) {
      return NextResponse.json(
        { success: false, error: 'Yorum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının daha önce bu yorumu beğenip beğenmediğini kontrol et
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .single();

    // Daha önce beğenmemiş mi?
    if (!existingLike || likeCheckError) {
      return NextResponse.json({
        success: false,
        error: 'Bu yorumu henüz beğenmediniz'
      }, { status: 400 });
    }

    // 1. comment_likes tablosundan sil
    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId);

    if (deleteError) {
      console.error('Error deleting comment like:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni kaldırılırken bir hata oluştu'
      }, { status: 500 });
    }

    // 2. likes_count alanını azalt (0'ın altına düşmemesi için kontrol)
    const newLikeCount = Math.max(0, (comment.likes_count || 0) - 1);
    
    const { error: updateError } = await supabase
      .from('comments')
      .update({ likes_count: newLikeCount })
      .eq('id', commentId);

    if (updateError) {
      // likes_count güncellenemezse, silinen beğeniyi geri ekle
      await supabase
        .from('comment_likes')
        .insert({
          user_id: userId,
          comment_id: commentId,
          created_at: new Date().toISOString()
        });

      console.error('Error updating comment like count:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Beğeni sayısı güncellenirken bir hata oluştu'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Yorum beğenisi kaldırıldı'
    });
  } catch (error) {
    console.error('Unexpected error in comment unliking:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
} 