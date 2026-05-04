import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from the URL path: /api/posts/user/[id]
    const userId = request.nextUrl.pathname.split('/')[4];
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Get user's posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        post_media (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Check for likes by the current user
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', session.id);

    if (likesError) {
      console.error('Error fetching likes:', likesError);
      // We'll continue without like information if there's an error
    }

    // Create a set of post IDs that the user has liked
    const likedPostIds = new Set(likes?.map(like => like.post_id) || []);

    // Process posts to include like information and media data
    const processedPosts = posts.map(post => {
      // Convert post_media array to media array for consistent naming in frontend
      const media = post.post_media || [];

      return {
        ...post,
        media,
        post_media: undefined, // Remove original post_media
        is_liked: likedPostIds.has(post.id),
      };
    });

    return NextResponse.json({
      success: true,
      posts: processedPosts
    });
  } catch (error) {
    console.error('Unexpected error in user posts fetch:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 