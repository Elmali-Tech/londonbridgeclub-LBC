import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// GET - Kullanıcının tüm konuşmalarını getir
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

    // Kullanıcının katıldığı tüm konuşmaları getir
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner(
          user_id,
          last_read_at
        )
      `)
      .eq('conversation_participants.user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Tüm konuşma ID'lerini topla
    const conversationIds = conversations.map(c => c.id);

    // Tüm katılımcı user ID'lerini tek seferde topla (batch)
    const allParticipantUserIds = [
      ...new Set(
        conversations.flatMap(c =>
          c.conversation_participants.map((p: any) => p.user_id)
        )
      )
    ];

    // Katılımcı kullanıcı bilgilerini TEK sorguda getir
    const { data: allParticipantUsers } = await supabase
      .from('users')
      .select('id, full_name, headline, profile_image_key')
      .in('id', allParticipantUserIds);

    const participantUserMap: Record<string, any> = {};
    (allParticipantUsers || []).forEach(u => { participantUserMap[u.id] = u; });

    // Bu kullanıcının okuduğu mesajları TEK sorguda getir
    const { data: readMessageIds } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id);

    const readSet = new Set((readMessageIds || []).map((r: any) => r.message_id));

    // Tüm konuşmalardaki okunmamış mesajları TEK sorguda getir
    const { data: allUnreadMessages } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id);

    // Konuşma bazında okunmamış sayısını hesapla (JS'de, DB'ye gitmeden)
    const unreadCountMap: Record<string, number> = {};
    (allUnreadMessages || []).forEach((msg: any) => {
      if (!readSet.has(msg.id)) {
        unreadCountMap[msg.conversation_id] = (unreadCountMap[msg.conversation_id] || 0) + 1;
      }
    });

    // Artık her konuşmayı ek DB çağrısı yapmadan oluştur
    const processedConversations = conversations.map(conv => {
      const unread_count = unreadCountMap[conv.id] || 0;

      const participantsWithUserInfo = conv.conversation_participants.map((participant: any) => ({
        ...participant,
        user: participantUserMap[participant.user_id] || null
      }));

      // Grup olmayan konuşmalar için diğer katılımcıyı bul
      let other_participant = null;
      if (!conv.is_group) {
        const otherParticipant = participantsWithUserInfo.find(
          (p: any) => p.user_id !== user.id
        );
        if (otherParticipant?.user) {
          other_participant = otherParticipant.user;
        }
      }

      return {
        ...conv,
        unread_count,
        other_participant,
        participants: participantsWithUserInfo
      };
    });

    return NextResponse.json({
      success: true,
      conversations: processedConversations
    });

  } catch (error) {
    console.error('Error in conversations GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Yeni konuşma oluştur
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { participant_ids, is_group = false, group_name, initial_message } = body;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Participant IDs are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Eğer grup değilse ve sadece iki kişi varsa, mevcut konuşmayı kontrol et
    if (!is_group && participant_ids.length === 1) {
      const otherUserId = participant_ids[0];
      
      // Mevcut konuşmayı bul
      const { data: existingConv } = await supabase.rpc('get_or_create_conversation', {
        user1_id: user.id,
        user2_id: otherUserId
      });

      if (existingConv) {
        return NextResponse.json({
          success: true,
          conversation: { id: existingConv }
        });
      }
    }

    // Yeni konuşma oluştur
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        is_group,
        group_name: is_group ? group_name : null
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json(
        { success: false, error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // Katılımcıları ekle (current user + diğerleri)
    const allParticipants = [user.id, ...participant_ids];
    const participantInserts = allParticipants.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      is_admin: userId === user.id // Creator admin olur
    }));

    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert(participantInserts);

    if (participantError) {
      console.error('Error adding participants:', participantError);
      return NextResponse.json(
        { success: false, error: 'Failed to add participants' },
        { status: 500 }
      );
    }

    // Eğer başlangıç mesajı varsa ekle
    if (initial_message) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: initial_message,
          message_type: 'text'
        });

      if (messageError) {
        console.error('Error sending initial message:', messageError);
      }
    }

    return NextResponse.json({
      success: true,
      conversation: { id: conversation.id }
    });

  } catch (error) {
    console.error('Error in conversations POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 