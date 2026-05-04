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

    // Get user ID from the URL path
    const userId = request.nextUrl.pathname.split('/')[3]; // /api/users/[id]
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Get user profile data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        username,
        headline,
        bio,
        profile_image_key,
        banner_image_key,
        location,
        industry,
        status,
        linkedin_url,
        website_url,
        date_of_birth,
        created_at
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if current user is following this user
    const { data: connectionData } = await supabase
      .from('connections')
      .select('*')
      .eq('follower_id', session.id)
      .eq('following_id', userId)
      .single();

    const isFollowing = connectionData ? true : false;

    // Get connection stats
    const { data: followerCount } = await supabase
      .from('connections')
      .select('id', { count: 'exact' })
      .eq('following_id', userId);

    const { data: followingCount } = await supabase
      .from('connections')
      .select('id', { count: 'exact' })
      .eq('follower_id', userId);

    // Get post count
    const { data: postCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    // Return user data with connection information
    return NextResponse.json({
      success: true,
      user: {
        ...userData,
        isFollowing,
        stats: {
          followers: followerCount?.length || 0,
          following: followingCount?.length || 0,
          posts: postCount?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Unexpected error in user profile fetch:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 