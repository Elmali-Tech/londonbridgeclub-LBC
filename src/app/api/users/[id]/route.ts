import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/lbc-data';
import { LbcMember } from '@/lib/lbc-api';
import { findLbcMemberByRouteId, mapLbcMemberToAuthUser } from '@/lib/lbc-auth';
import { getLbcPlan } from '@/lib/lbc-members';

function numberFromUnknown(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapLbcMemberToProfile(member: LbcMember) {
  const user = mapLbcMemberToAuthUser(member);
  const plan = getLbcPlan(member);

  return {
    id: `lbc:${member.id}`,
    internal_user_id: null,
    full_name: user.full_name,
    username: member.member_id || undefined,
    headline: user.headline,
    bio: user.bio,
    profile_image_key: user.profile_image_key,
    banner_image_key: user.banner_image_key,
    location: user.location,
    industry: user.industry,
    status: user.status,
    linkedin_url: user.linkedin_url,
    website_url: user.website_url,
    date_of_birth: user.date_of_birth,
    created_at: user.created_at,
    auth_provider: 'lbc',
    lbc_record_id: member.id,
    lbc_member_id: member.member_id || null,
    lbc_member_type: member.type || null,
    lbc_tier: member.tier || member.active_subscription?.tier || null,
    lbc_is_anchor: member.is_anchor ?? null,
    lbc_member_payload: member,
    isFollowing: false,
    can_interact: false,
    membership_plan: plan,
    stats: {
      followers: 0,
      following: numberFromUnknown(member.knows_count),
      posts: 0,
    },
  };
}

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

    const isLbcRoute =
      userId.startsWith('lbc:') ||
      userId.startsWith('rec') ||
      session.auth_provider === 'lbc';

    if (isLbcRoute) {
      const lbcMember = await findLbcMemberByRouteId(userId);

      if (!lbcMember) {
        return NextResponse.json(
          { success: false, error: 'LBC member not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: mapLbcMemberToProfile(lbcMember),
      });
    }

    // Create LbcData client
    const lbcData = createClient();

    // Get user profile data
    const { data: userData, error: userError } = await lbcData
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
    const { data: connectionData } = await lbcData
      .from('connections')
      .select('*')
      .eq('follower_id', session.id)
      .eq('following_id', userId)
      .single();

    const isFollowing = connectionData ? true : false;

    // Get connection stats
    const { data: followerCount } = await lbcData
      .from('connections')
      .select('id', { count: 'exact' })
      .eq('following_id', userId);

    const { data: followingCount } = await lbcData
      .from('connections')
      .select('id', { count: 'exact' })
      .eq('follower_id', userId);

    // Get post count
    const { data: postCount } = await lbcData
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const { data: subscriptionData } = await lbcData
      .from('subscriptions')
      .select('membership_plans(name, slug)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const membershipPlan = Array.isArray(subscriptionData?.membership_plans)
      ? subscriptionData?.membership_plans[0] || null
      : subscriptionData?.membership_plans || null;

    // Return user data with connection information
    return NextResponse.json({
      success: true,
      user: {
        ...userData,
        isFollowing,
        membership_plan: membershipPlan,
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
