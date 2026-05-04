import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user || !user.is_admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);
    if (isNaN(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // First verify that this is an admin post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('is_admin_post')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    if (!post.is_admin_post) {
      return NextResponse.json(
        { success: false, error: 'Not an admin post' },
        { status: 403 }
      );
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting admin post:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in admin posts DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 