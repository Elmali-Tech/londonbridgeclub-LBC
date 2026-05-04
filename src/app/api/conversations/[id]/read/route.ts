import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// POST - Konuşmadaki mesajları okundu olarak işaretle
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
    const conversationId = parseInt(resolvedParams.id);
    const supabase = createClient();

    // Kullanıcının bu konuşmaya katılıp katılmadığını kontrol et
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this conversation' },
        { status: 403 }
      );
    }

    // Supabase fonksiyonunu kullanarak mesajları okundu olarak işaretle
    const { error } = await supabase.rpc('mark_conversation_as_read', {
      conv_id: conversationId,
      target_user_id: user.id
    });

    if (error) {
      console.error('Error marking conversation as read:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to mark conversation as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation marked as read'
    });

  } catch (error) {
    console.error('Error in conversation read POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 