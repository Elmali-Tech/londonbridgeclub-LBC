import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// GET - Kullanıcının tüm sohbetlerini getir (OPTIMIZED)
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

    // OPTIMIZED: Single query with all necessary joins to avoid N+1 problem
    const { data: chatsData, error } = await supabase.rpc('get_user_chats_optimized', {
      target_user_id: user.id
    });

    if (error) {
      console.error('Error fetching chats:', error);
      
      // Fallback to original query if RPC fails
      return await getFallbackChats(supabase, user.id);
    }

    // Process the optimized data
    const chatsMap = new Map();
    const participantsMap = new Map();
    
    chatsData?.forEach((row: any) => {
      const chatId = row.chat_id;
      
      // Build chat object
      if (!chatsMap.has(chatId)) {
        chatsMap.set(chatId, {
          id: chatId,
          type: row.chat_type,
          name: row.chat_name,
          description: row.chat_description,
          avatar_key: row.chat_avatar_key,
          created_by: row.chat_created_by,
          created_at: row.chat_created_at,
          updated_at: row.chat_updated_at,
          last_message_at: row.chat_last_message_at,
          last_message_preview: row.chat_last_message_preview,
          is_active: row.chat_is_active,
          unread_count: row.unread_count || 0,
          participants: []
        });
        participantsMap.set(chatId, new Set());
      }
      
      // Add participant if exists and not already added
      if (row.participant_user_id && !participantsMap.get(chatId).has(row.participant_user_id)) {
        const participant = {
          id: row.participant_id,
          chat_id: chatId,
          user_id: row.participant_user_id,
          role: row.participant_role,
          joined_at: row.participant_joined_at,
          last_seen_at: row.participant_last_seen_at,
          is_active: row.participant_is_active,
          user: row.participant_user_id ? {
            id: row.participant_user_id,
            full_name: row.user_full_name,
            headline: row.user_headline,
            profile_image_key: row.user_profile_image_key
          } : null
        };
        
        chatsMap.get(chatId).participants.push(participant);
        participantsMap.get(chatId).add(row.participant_user_id);
      }
    });

    // Convert to array and add other_participant for direct chats
    const chats = Array.from(chatsMap.values()).map((chat: any) => {
      let otherParticipant = null;
      if (chat.type === 'direct' && chat.participants) {
        const otherUser = chat.participants.find((p: any) => p.user_id !== user.id);
        if (otherUser && otherUser.user) {
          otherParticipant = {
            id: otherUser.user.id,
            full_name: otherUser.user.full_name,
            headline: otherUser.user.headline,
            profile_image_key: otherUser.user.profile_image_key
          };
        }
      }
      
      return {
        ...chat,
        other_participant: otherParticipant
      };
    });

    // Sort by last message time
    chats.sort((a, b) => {
      const aTime = new Date(a.last_message_at || a.created_at).getTime();
      const bTime = new Date(b.last_message_at || b.created_at).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      chats
    });

  } catch (error) {
    console.error('Error in chats GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Fallback function for when RPC is not available
async function getFallbackChats(supabase: any, userId: number) {
  try {
    // Kullanıcının katıldığı tüm aktif sohbetleri getir
    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants!inner(
          user_id,
          role,
          last_seen_at,
          is_active
        )
      `)
      .eq('chat_participants.user_id', userId)
      .eq('chat_participants.is_active', true)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });

    if (error) {
      throw error;
    }

    // OPTIMIZED: Get all participants and unread counts in batches
    const chatIds = chats.map((chat: any) => chat.id);
    
    // Get all participants for all chats at once
    const { data: allParticipants } = await supabase
      .from('chat_participants')
      .select(`
        *,
        user:users(id, full_name, headline, profile_image_key)
      `)
      .in('chat_id', chatIds)
      .eq('is_active', true);

    // Get all unread counts at once using a single query
    const { data: unreadCounts } = await supabase
      .from('messages')
      .select('chat_id')
      .in('chat_id', chatIds)
      .neq('sender_id', userId)
      .eq('is_deleted', false)
      .not('id', 'in', `(
        SELECT message_id FROM message_reads WHERE user_id = ${userId}
      )`);

    // Group participants by chat_id
    const participantsByChat: Record<number, any[]> = {};
    allParticipants?.forEach((participant: any) => {
      if (!participantsByChat[participant.chat_id]) {
        participantsByChat[participant.chat_id] = [];
      }
      participantsByChat[participant.chat_id].push(participant);
    });

    // Count unread messages by chat_id
    const unreadCountsByChat: Record<number, number> = {};
    unreadCounts?.forEach((message: any) => {
      unreadCountsByChat[message.chat_id] = (unreadCountsByChat[message.chat_id] || 0) + 1;
    });

    // Build final response
    const chatsWithDetails = chats.map((chat: any) => {
      const participants = participantsByChat[chat.id] || [];
      
      // Direct chat için diğer katılımcıyı bul
      let otherParticipant = null;
      if (chat.type === 'direct' && participants) {
        const otherUser = participants.find(p => p.user_id !== userId);
        if (otherUser && otherUser.user) {
          otherParticipant = {
            id: otherUser.user.id,
            full_name: otherUser.user.full_name,
            headline: otherUser.user.headline,
            profile_image_key: otherUser.user.profile_image_key
          };
        }
      }

      return {
        ...chat,
        participants,
        other_participant: otherParticipant,
        unread_count: unreadCountsByChat[chat.id] || 0
      };
    });

    return NextResponse.json({
      success: true,
      chats: chatsWithDetails
    });

  } catch (error) {
    console.error('Error in fallback chats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST - Yeni sohbet oluştur (OPTIMIZED)
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
    const { type, participant_ids, name, description, initial_message } = body;

    if (!type || !participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Type and participant IDs are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Direct chat için mevcut sohbeti kontrol et - OPTIMIZED with RPC
    if (type === 'direct' && participant_ids.length === 1) {
      const otherUserId = participant_ids[0];
      
      // Use optimized RPC function
      const { data: existingChatId } = await supabase.rpc('get_or_create_direct_chat', {
        user1_id: user.id,
        user2_id: otherUserId
      });

      if (existingChatId) {
        // Eğer başlangıç mesajı varsa gönder
        if (initial_message) {
          await supabase
            .from('messages')
            .insert({
              chat_id: existingChatId,
              sender_id: user.id,
              content: initial_message,
              message_type: 'text'
            });
        }

        return NextResponse.json({
          success: true,
          chat: { id: existingChatId }
        });
      }
    }

    // Yeni sohbet oluştur (grup veya mevcut direct chat yoksa)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        type,
        name: type === 'group' ? name : null,
        description: type === 'group' ? description : null,
        created_by: user.id
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json(
        { success: false, error: 'Failed to create chat' },
        { status: 500 }
      );
    }

    // OPTIMIZED: Batch insert participants
    const allParticipants = [user.id, ...participant_ids];
    const participantInserts = allParticipants.map(userId => ({
      chat_id: chat.id,
      user_id: userId,
      role: userId === user.id ? 'admin' : 'member'
    }));

    const { error: participantError } = await supabase
      .from('chat_participants')
      .insert(participantInserts);

    if (participantError) {
      console.error('Error adding participants:', participantError);
      return NextResponse.json(
        { success: false, error: 'Failed to add participants' },
        { status: 500 }
      );
    }

    // Başlangıç mesajı varsa ekle
    if (initial_message) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
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
      chat: { id: chat.id }
    });

  } catch (error) {
    console.error('Error in chats POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 