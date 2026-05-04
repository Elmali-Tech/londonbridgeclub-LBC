import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const mostFollowed = searchParams.get('mostFollowed');
    const excludeParam = searchParams.get('exclude');
    const allUsers = searchParams.get('all');

    let users = [];

    if (idsParam) {
      // Belirli id'lere göre kullanıcıları getir
      const ids = idsParam.split(',').map(Number).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ success: true, users: [] });
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, headline, profile_image_key')
        .in('id', ids);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      users = data || [];
    } else if (allUsers === 'true') {
      // Tüm kullanıcıları getir (kendisi hariç)
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, headline, profile_image_key, created_at, status, email, location, industry, subscription_status')
        .neq('id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      // Follow status'u kontrol et
      const userIds = (data || []).map(u => u.id);
      const { data: followData } = await supabase
        .from('connections')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds);

      const followingIds = new Set((followData || []).map(f => f.following_id));

      users = (data || []).map(u => ({
        ...u,
        isFollowing: followingIds.has(u.id)
      }));
    } else if (mostFollowed) {
      // En çok takipçisi olan kullanıcıları getir (exclude edilenler hariç)
      let excludeIds: number[] = [];
      if (excludeParam) {
        excludeIds = excludeParam.split(',').map(Number).filter(Boolean);
      }

      // Get all connections first
      const { data: connections, error } = await supabase
        .from('connections')
        .select('following_id')
        .not('following_id', 'in', `(${excludeIds.join(',')})`);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      // Count followers for each user
      const followerCounts = (connections || []).reduce((acc: any, curr) => {
        acc[curr.following_id] = (acc[curr.following_id] || 0) + 1;
        return acc;
      }, {});

      // Get top 5 users by follower count
      const topUserIds = Object.entries(followerCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([id]) => Number(id));

      if (topUserIds.length === 0) {
        return NextResponse.json({ success: true, users: [] });
      }

      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, headline, profile_image_key')
        .in('id', topUserIds);

      if (userError) {
        return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
      }

      // Add follower counts
      users = (userData || []).map(u => ({
        ...u,
        followerCount: followerCounts[u.id] || 0
      }));
    } else {
      return NextResponse.json({ success: false, error: 'No valid query' }, { status: 400 });
    }
    return NextResponse.json({ success: true, users });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
} 