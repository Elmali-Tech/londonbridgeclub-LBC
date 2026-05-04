import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// POST request - Yorum ekleme
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

    // İstek gövdesinden yorum içeriğini al
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Yorum içeriği boş olamaz' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // First, check if the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, comments_count')
      .eq('id', postId)
      .single();

    if (postError) {
      return NextResponse.json(
        { success: false, error: 'Post bulunamadı' },
        { status: 404 }
      );
    }

    // Yorumu ekle
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json(
        { success: false, error: 'Yorum eklenirken bir hata oluştu' },
        { status: 500 }
      );
    }

    // Post'un comments_count değerini arttır
    const { error: updateError } = await supabase
      .from('posts')
      .update({ comments_count: (post?.comments_count || 0) + 1 })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating comment count:', updateError);
      // Bu hatayı görmezden gelebiliriz, çünkü yorum eklenmiş durumda
    }

    return NextResponse.json({
      success: true,
      message: 'Yorum başarıyla eklendi',
      comment
    });
  } catch (error) {
    console.error('Unexpected error in adding comment:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}

// GET request - Yorumları getirme
export async function GET(
  request: NextRequest,
) {
  try {
    // Get post ID from the URL
    const postId = request.nextUrl.pathname.split('/')[3];
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID gerekli' },
        { status: 400 }
      );
    }

    // Validate the session to get user id
    const session = await validateSession(request);
    const userId = session ? session.id.toString() : null;

    // Create Supabase client
    const supabase = createClient();

    // Yorumları getir - kullanıcı bilgileriyle birlikte
    const { data: comments, error: fetchError } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_id (id, full_name, headline, profile_image_key)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching comments:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Yorumlar alınırken bir hata oluştu' },
        { status: 500 }
      );
    }

    // Eğer kullanıcı oturum açmışsa, beğenileri kontrol et
    if (userId) {
      const { data: likedComments, error: likeError } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId);

      if (!likeError && likedComments) {
        // Beğenilmiş yorumların ID'lerini Set olarak tut
        const likedCommentIds = new Set(likedComments.map(like => like.comment_id));
        
        // Her yoruma isLiked özelliği ekle
        comments.forEach(comment => {
          comment.isLiked = likedCommentIds.has(comment.id);
        });
      }
    }

    return NextResponse.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Unexpected error in fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
} 