import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Get users who joined in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, headline, profile_image_key, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(4); // Limit to 4 most recent users

    if (error) {
      console.error('Error fetching recent users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: users || [],
      count: users?.length || 0
    });

  } catch (error) {
    console.error('Error in recent users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

