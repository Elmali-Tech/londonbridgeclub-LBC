import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// POST - Sohbeti okundu olarak işaretle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const chatId = parseInt(resolvedParams.id);
    const supabase = createClient();

    // Kullanıcının bu sohbete katılıp katılmadığını kontrol et
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this chat' },
        { status: 403 }
      );
    }

    // Database fonksiyonunu kullanarak sohbeti okundu olarak işaretle
    const { data: result, error } = await supabase.rpc('mark_chat_as_read', {
      target_chat_id: chatId,
      target_user_id: user.id
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to mark chat as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chat marked as read successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 