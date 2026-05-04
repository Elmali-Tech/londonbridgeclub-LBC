-- Enable Realtime for Messaging Tables
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- Enable realtime replication for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;

-- Create helper functions for conversation management
-- Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user1_id TEXT,
  user2_id TEXT
)
RETURNS BIGINT AS $$
DECLARE
  conversation_id BIGINT;
BEGIN
  -- Try to find existing conversation between these two users
  SELECT c.id INTO conversation_id
  FROM public.conversations c
  WHERE c.is_group = FALSE
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
    AND (
      SELECT COUNT(*) FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
    ) = 2;

  -- If conversation doesn't exist, create it
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (is_group)
    VALUES (FALSE)
    RETURNING id INTO conversation_id;
    
    -- Add both users as participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
      (conversation_id, user1_id),
      (conversation_id, user2_id);
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_messages_count(target_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT m.id) INTO unread_count
  FROM public.messages m
  JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = target_user_id
    AND m.sender_id != target_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.message_reads mr
      WHERE mr.message_id = m.id AND mr.user_id = target_user_id
    );
    
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark messages as read in a conversation
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  conversation_id_param BIGINT,
  user_id_param TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Insert read records for all unread messages in this conversation
  INSERT INTO public.message_reads (message_id, user_id)
  SELECT m.id, user_id_param
  FROM public.messages m
  WHERE m.conversation_id = conversation_id_param
    AND m.sender_id != user_id_param
    AND NOT EXISTS (
      SELECT 1 FROM public.message_reads mr
      WHERE mr.message_id = m.id AND mr.user_id = user_id_param
    );
    
  -- Update participant's last_read_at
  UPDATE public.conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = conversation_id_param AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 