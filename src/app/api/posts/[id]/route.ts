import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// DELETE API for deleting a post
export async function DELETE(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the session
    const userId = session.id.toString();

    // Get post ID from the URL
    const postId = request.nextUrl.pathname.split('/')[3]; // /api/posts/[id]
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID gerekli' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // First, check if the post exists and belongs to the user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (postError) {
      return NextResponse.json(
        { success: false, error: 'Post bulunamadı' },
        { status: 404 }
      );
    }

    // Check if the user is the owner of the post
    if (post.user_id.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Bu postu silme yetkiniz yok' },
        { status: 403 }
      );
    }

    // First delete associated media (if any)
    const { error: mediaDeleteError } = await supabase
      .from('post_media')
      .delete()
      .eq('post_id', postId);

    if (mediaDeleteError) {
      console.error('Error deleting post media:', mediaDeleteError);
      // Continue with post deletion even if media deletion fails
    }

    // Also delete any likes associated with this post
    const { error: likesDeleteError } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId);

    if (likesDeleteError) {
      console.error('Error deleting post likes:', likesDeleteError);
      // Continue with post deletion even if likes deletion fails
    }

    // Delete comments associated with this post
    const { error: commentsDeleteError } = await supabase
      .from('comments')
      .delete()
      .eq('post_id', postId);

    if (commentsDeleteError) {
      console.error('Error deleting post comments:', commentsDeleteError);
      // Continue with post deletion even if comments deletion fails
    }

    // Delete the post itself
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId); // Extra security to ensure only owner can delete

    if (deleteError) {
      // Check for RLS policy error
      if (deleteError.code === '42501') {
        console.error('RLS policy error:', deleteError);
        return NextResponse.json({
          success: false,
          error: 'Post silme izni yok. RLS politikası hatası.'
        }, { status: 403 });
      }
      
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Post silinirken bir hata oluştu'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post başarıyla silindi'
    });
    
  } catch (error) {
    console.error('Unexpected error in post deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
} 