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
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // First get the list of users that the current user follows
    const { data: followedUsers, error: followedError } = await supabase
      .from('connections')
      .select('following_id')
      .eq('follower_id', user.id.toString());

    if (followedError) {
      console.error('Error fetching followed users:', followedError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch followed users' },
        { status: 500 }
      );
    }

    const followedUserIds = followedUsers ? followedUsers.map(follow => follow.following_id) : [];
    
    // Add current user's ID to see their own posts
    const userIdsToFetch = [...followedUserIds, user.id.toString()];

    // Fetch admin posts with media
    const { data: adminPosts, error: adminError } = await supabase
      .from('posts')
      .select(`
        *,
        post_media (
          id,
          post_id,
          media_type,
          s3_bucket_name,
          s3_key,
          media_original_name,
          media_size,
          media_content_type,
          created_at
        )
      `)
      .eq('is_admin_post', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(15);

    if (adminError) {
      console.error('Error fetching admin posts:', adminError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch admin posts' },
        { status: 500 }
      );
    }

    // Fetch posts from followed users and current user's posts with media
    let userPosts = [];
    let postsError = null;
    
    if (userIdsToFetch.length > 0) {
      const { data: fetchedUserPosts, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
          post_media (
            id,
            post_id,
            media_type,
            s3_bucket_name,
            s3_key,
            media_original_name,
            media_size,
            media_content_type,
            created_at
          )
        `)
        .in('user_id', userIdsToFetch)
        .eq('is_admin_post', false)
        .order('created_at', { ascending: false })
        .limit(50);

      userPosts = fetchedUserPosts || [];
      postsError = fetchError;
    }

    if (postsError) {
      console.error('Error fetching user posts:', postsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Combine all posts
    const allPosts = [...(adminPosts || []), ...userPosts];

    // Get unique user IDs from all posts
    const uniqueUserIds = [...new Set(allPosts.map(post => post.user_id))];
    
    // Fetch user information for all post authors
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, headline, profile_image_key')
      .in('id', uniqueUserIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }

    // Create a map of user ID to user info
    const userMap: { [key: string]: any } = {};
    users?.forEach(u => {
      userMap[u.id] = u;
    });

    // Add author information to each post and process media
    const postsWithAuthors = allPosts.map(post => ({
      ...post,
      media: post.post_media || [], // Convert post_media to media for frontend consistency
      post_media: undefined, // Remove original post_media field
      author: userMap[post.user_id] || {
        id: post.user_id,
        full_name: 'Unknown User',
        headline: '',
        profile_image_key: null
      }
    }));

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
    const postsWithLikeInfo = postsWithAuthors.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post.id)
    }));

    // Sort posts by pinned status and creation date
    const sortedPosts = postsWithLikeInfo.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Add appropriate message based on posts available
    let message = '';
    if (sortedPosts.length === 0) {
      if (followedUserIds.length === 0) {
        message = 'Henüz kimseyi takip etmiyorsunuz. Diğer üyeleri keşfetmek için üyeler sayfasını ziyaret edin.';
      } else {
        message = 'Takip ettiğiniz kişilerden henüz paylaşım yok. İlk paylaşımı siz yapın!';
      }
    }

    return NextResponse.json({
      success: true,
      posts: sortedPosts,
      message: message
    });

  } catch (error) {
    console.error('Error in feed GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}