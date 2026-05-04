import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user || !user.is_admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Fetch admin posts with author information
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:user_id (id, full_name, headline, profile_image_key)
      `)
      .eq('is_admin_post', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching admin posts:', postsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Check which posts are liked by the current user
    const { data: likedPosts, error: likeError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id);

    // Create a set of liked post IDs
    const likedPostIds = new Set();
    if (likedPosts && !likeError) {
      likedPosts.forEach(like => {
        likedPostIds.add(like.post_id);
      });
    }

    // Add isLiked property to each post
    const postsWithLikeInfo = posts.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post.id)
    }));

    return NextResponse.json({
      success: true,
      posts: postsWithLikeInfo
    });

  } catch (error) {
    console.error('Error in admin posts GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user || !user.is_admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, isPinned } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Create the admin post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        content,
        user_id: user.id,
        is_admin_post: true,
        is_pinned: isPinned || false,
        visibility: 'public'
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating admin post:', postError);
      return NextResponse.json(
        { success: false, error: 'Failed to create post' },
        { status: 500 }
      );
    }

    // Add author information
    const postWithAuthor = {
      ...post,
      author: {
        id: user.id,
        full_name: 'LBC Admin',
        headline: 'London Bridge Club Administrator',
        profile_image_key: user.profile_image_key
      },
      isLiked: false
    };

    return NextResponse.json({
      success: true,
      post: postWithAuthor
    });

  } catch (error) {
    console.error('Error in admin posts POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 