-- CLEANUP MESSAGING SYSTEM - Complete removal of all messaging tables and functions
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

BEGIN;

-- 1. Drop all RLS policies first
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

-- 2. Drop all triggers
DROP TRIGGER IF EXISTS update_conversation_on_message_trigger ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_on_participant_insert_trigger ON public.conversation_participants;
DROP TRIGGER IF EXISTS update_conversation_on_participant_delete_trigger ON public.conversation_participants;

-- 3. Drop all functions
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_participant_change() CASCADE;
DROP FUNCTION IF EXISTS get_or_create_conversation(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_conversation(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_unread_messages_count(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_unread_messages_count(TEXT) CASCADE;
DROP FUNCTION IF EXISTS mark_conversation_as_read(BIGINT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS mark_conversation_as_read(BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;

-- 4. Remove tables from realtime publication if they exist
DO $$
BEGIN
    -- Check if the table exists in the publication before trying to remove it
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversation_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.conversation_participants;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'message_reads'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.message_reads;
    END IF;
END $$;

-- 5. Drop all messaging tables (in correct order due to foreign key dependencies)
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- 6. Drop indexes if they still exist
DROP INDEX IF EXISTS idx_conversations_updated_at;
DROP INDEX IF EXISTS idx_conversation_participants_user_id;
DROP INDEX IF EXISTS idx_conversation_participants_conversation_id;
DROP INDEX IF EXISTS idx_messages_conversation_id;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_message_reads_user_id;
DROP INDEX IF EXISTS idx_message_reads_message_id;

COMMIT;

-- Success message
SELECT 'All messaging system tables, functions, and policies cleaned up successfully!' as result; 