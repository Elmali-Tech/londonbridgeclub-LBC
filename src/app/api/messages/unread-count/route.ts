import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// GET - Kullanıcının okunmamış mesaj sayısını getir
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

    // Database fonksiyonunu kullanarak okunmamış mesaj sayısını al
    const { data: unreadCount, error } = await supabase.rpc('get_user_unread_count', {
      target_user_id: user.id
    });

    if (error) {
      console.error('Error getting unread count:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get unread count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unread_count: unreadCount || 0
    });

  } catch (error) {
    console.error('Error in unread count GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 