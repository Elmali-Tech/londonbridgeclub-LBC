import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Get today's month and day
    const today = new Date();
    const month = today.getMonth() + 1; // JavaScript months are 0-indexed
    const day = today.getDate();

    // Query users whose birthday is today
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, headline, profile_image_key, date_of_birth')
      .not('date_of_birth', 'is', null)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching birthday users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch birthday users' },
        { status: 500 }
      );
    }

    // Filter users whose birthday is today (month and day match)
    const birthdayUsers = users?.filter(user => {
      if (!user.date_of_birth) return false;
      const birthDate = new Date(user.date_of_birth);
      return birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
    }) || [];

    return NextResponse.json({
      users: birthdayUsers,
      count: birthdayUsers.length
    });

  } catch (error) {
    console.error('Error in birthdays API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

