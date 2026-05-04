-- Fix Foreign Key Relationships for Messaging System
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- Problem: user_id columns are TEXT but auth.users.id is UUID
-- Solution: Clean invalid data, drop policies, change column types to UUID, then recreate policies

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
-- Check and clean conversation_participants
DO $$
BEGIN
    -- Delete records where user_id is not a valid UUID format
    DELETE FROM public.conversation_participants 
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Delete records where user_id doesn't exist in auth.users
    DELETE FROM public.conversation_participants 
    WHERE user_id NOT IN (SELECT id::text FROM auth.users);
    
    RAISE NOTICE 'Cleaned up conversation_participants table';
END $$;

-- Check and clean messages
DO $$
BEGIN
    -- Delete records where sender_id is not a valid UUID format
    DELETE FROM public.messages 
    WHERE sender_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Delete records where sender_id doesn't exist in auth.users
    DELETE FROM public.messages 
    WHERE sender_id NOT IN (SELECT id::text FROM auth.users);
    
    RAISE NOTICE 'Cleaned up messages table';
END $$;

-- Check and clean message_reads
DO $$
BEGIN
    -- Delete records where user_id is not a valid UUID format
    DELETE FROM public.message_reads 
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Delete records where user_id doesn't exist in auth.users
    DELETE FROM public.message_reads 
    WHERE user_id NOT IN (SELECT id::text FROM auth.users);
    
    RAISE NOTICE 'Cleaned up message_reads table';
END $$;

-- 3. Now change column types from TEXT to UUID
-- Fix conversation_participants table
ALTER TABLE public.conversation_participants 
    ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Fix messages table
ALTER TABLE public.messages 
    ALTER COLUMN sender_id TYPE UUID USING sender_id::UUID;

-- Fix message_reads table
ALTER TABLE public.message_reads 
    ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 4. Add foreign key constraints
ALTER TABLE public.conversation_participants 
    ADD CONSTRAINT conversation_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
    ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.message_reads 
    ADD CONSTRAINT message_reads_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Recreate RLS policies with proper UUID handling
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
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
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations they're in"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to conversations they're in"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view read status in their conversations"
  ON public.message_reads FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_reads.message_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON public.message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMIT;

-- Success message
SELECT 'Foreign key relationships fixed successfully with proper UUID types!' as result; 