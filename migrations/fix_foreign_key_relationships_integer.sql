-- Fix Foreign Key Relationships for Messaging System (Integer User IDs)
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- Problem: Messaging system was designed for auth.users (UUID) but we use custom users table (integer)
-- Solution: Fix data types and foreign keys to reference public.users instead of auth.users

BEGIN;

-- 1. First drop all RLS policies that reference the columns we need to change
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to conversations they're in" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view read status in their conversations" ON public.message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_reads;

-- 2. Clean up invalid data before type conversion
-- First check what data types we're working with and clean accordingly
DO $$
DECLARE
    user_id_type text;
    sender_id_type text;
BEGIN
    -- Check current data type of user_id in conversation_participants
    SELECT data_type INTO user_id_type
    FROM information_schema.columns 
    WHERE table_name = 'conversation_participants' 
    AND column_name = 'user_id' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'conversation_participants.user_id type: %', user_id_type;
    
    -- Clean based on current data type
    IF user_id_type = 'uuid' THEN
        -- If it's UUID, we need to delete all records since we can't convert UUID to integer
        DELETE FROM public.conversation_participants;
        RAISE NOTICE 'Deleted all conversation_participants records (UUID to INTEGER conversion)';
    ELSIF user_id_type = 'text' THEN
        -- If it's text, check if it's numeric
        DELETE FROM public.conversation_participants 
        WHERE user_id !~ '^\d+$';
        RAISE NOTICE 'Cleaned up non-numeric conversation_participants records';
    END IF;
    
    -- Clean up orphaned records (if any remain)
    DELETE FROM public.conversation_participants 
    WHERE (CASE 
        WHEN user_id_type = 'text' THEN user_id::integer 
        WHEN user_id_type = 'integer' THEN user_id
        ELSE 0 
    END) NOT IN (SELECT id FROM public.users);
END $$;

DO $$
DECLARE
    sender_id_type text;
BEGIN
    -- Check current data type of sender_id in messages
    SELECT data_type INTO sender_id_type
    FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'sender_id' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'messages.sender_id type: %', sender_id_type;
    
    -- Clean based on current data type
    IF sender_id_type = 'uuid' THEN
        -- If it's UUID, delete all records
        DELETE FROM public.messages;
        RAISE NOTICE 'Deleted all messages records (UUID to INTEGER conversion)';
    ELSIF sender_id_type = 'text' THEN
        -- If it's text, check if it's numeric
        DELETE FROM public.messages 
        WHERE sender_id !~ '^\d+$';
        RAISE NOTICE 'Cleaned up non-numeric messages records';
    END IF;
    
    -- Clean up orphaned records (if any remain)
    DELETE FROM public.messages 
    WHERE (CASE 
        WHEN sender_id_type = 'text' THEN sender_id::integer 
        WHEN sender_id_type = 'integer' THEN sender_id
        ELSE 0 
    END) NOT IN (SELECT id FROM public.users);
END $$;

DO $$
DECLARE
    user_id_type text;
BEGIN
    -- Check current data type of user_id in message_reads
    SELECT data_type INTO user_id_type
    FROM information_schema.columns 
    WHERE table_name = 'message_reads' 
    AND column_name = 'user_id' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'message_reads.user_id type: %', user_id_type;
    
    -- Clean based on current data type
    IF user_id_type = 'uuid' THEN
        -- If it's UUID, delete all records
        DELETE FROM public.message_reads;
        RAISE NOTICE 'Deleted all message_reads records (UUID to INTEGER conversion)';
    ELSIF user_id_type = 'text' THEN
        -- If it's text, check if it's numeric
        DELETE FROM public.message_reads 
        WHERE user_id !~ '^\d+$';
        RAISE NOTICE 'Cleaned up non-numeric message_reads records';
    END IF;
    
    -- Clean up orphaned records (if any remain)
    DELETE FROM public.message_reads 
    WHERE (CASE 
        WHEN user_id_type = 'text' THEN user_id::integer 
        WHEN user_id_type = 'integer' THEN user_id
        ELSE 0 
    END) NOT IN (SELECT id FROM public.users);
END $$;

-- 3. Change column types from TEXT to INTEGER
-- Fix conversation_participants table
ALTER TABLE public.conversation_participants 
    ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER;

-- Fix messages table
ALTER TABLE public.messages 
    ALTER COLUMN sender_id TYPE INTEGER USING sender_id::INTEGER;

-- Fix message_reads table
ALTER TABLE public.message_reads 
    ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER;

-- 4. Add foreign key constraints to public.users (not auth.users)
ALTER TABLE public.conversation_participants 
    ADD CONSTRAINT conversation_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
    ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.message_reads 
    ADD CONSTRAINT message_reads_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Create helper functions for session management
CREATE OR REPLACE FUNCTION set_config(setting_name text, setting_value text)
RETURNS text AS $$
BEGIN
    PERFORM set_config(setting_name, setting_value, false);
    RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
DECLARE
    current_user_id INTEGER;
BEGIN
    -- Get user_id from current session context
    -- This will be set by the application when making authenticated requests
    SELECT COALESCE(current_setting('app.current_user_id', true)::INTEGER, 0) INTO current_user_id;
    RETURN current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate RLS policies using integer user IDs and session context
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = get_current_user_id()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = get_current_user_id()
    )
  );

CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = get_current_user_id()
    )
  );

CREATE POLICY "Users can add participants to conversations they're in"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = get_current_user_id()
    ) OR conversation_participants.user_id = get_current_user_id()
  );

CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = get_current_user_id()
    )
  );

CREATE POLICY "Users can send messages to conversations they're in"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = get_current_user_id() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = get_current_user_id()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = get_current_user_id());

CREATE POLICY "Users can view read status in their conversations"
  ON public.message_reads FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_reads.message_id
      AND cp.user_id = get_current_user_id()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON public.message_reads FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- 7. Update helper functions to work with integer user IDs
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id INTEGER, user2_id INTEGER)
RETURNS BIGINT AS $$
DECLARE
    conv_id BIGINT;
BEGIN
    -- Try to find existing conversation between these two users
    SELECT c.id INTO conv_id
    FROM conversations c
    WHERE c.is_group = false
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp1 
        WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp2 
        WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
    AND (
        SELECT COUNT(*) FROM conversation_participants cp 
        WHERE cp.conversation_id = c.id
    ) = 2;
    
    -- If conversation exists, return it
    IF conv_id IS NOT NULL THEN
        RETURN conv_id;
    END IF;
    
    -- Create new conversation
    INSERT INTO conversations (is_group) VALUES (false) RETURNING id INTO conv_id;
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES 
        (conv_id, user1_id),
        (conv_id, user2_id);
    
    RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_messages_count(target_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = target_user_id
    AND m.sender_id != target_user_id
    AND NOT EXISTS (
        SELECT 1 FROM message_reads mr 
        WHERE mr.message_id = m.id AND mr.user_id = target_user_id
    );
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_conversation_as_read(conv_id BIGINT, target_user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mark all unread messages in this conversation as read
    INSERT INTO message_reads (message_id, user_id)
    SELECT m.id, target_user_id
    FROM messages m
    WHERE m.conversation_id = conv_id
    AND m.sender_id != target_user_id
    AND NOT EXISTS (
        SELECT 1 FROM message_reads mr 
        WHERE mr.message_id = m.id AND mr.user_id = target_user_id
    );
    
    -- Update last_read_at for this user in this conversation
    UPDATE conversation_participants 
    SET last_read_at = NOW()
    WHERE conversation_id = conv_id AND user_id = target_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Success message
SELECT 'Foreign key relationships fixed successfully with integer user IDs!' as result; 