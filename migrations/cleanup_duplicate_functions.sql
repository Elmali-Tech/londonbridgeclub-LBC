-- Cleanup Duplicate Functions - Fix Function Overloading Issue
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

BEGIN;

-- 1. Drop all versions of the conflicting functions
DROP FUNCTION IF EXISTS public.get_unread_messages_count(target_user_id INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_messages_count(target_user_id TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_messages_count(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_messages_count(TEXT) CASCADE;

DROP FUNCTION IF EXISTS public.get_or_create_conversation(user1_id INTEGER, user2_id INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_conversation(user1_id TEXT, user2_id TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_conversation(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_conversation(TEXT, TEXT) CASCADE;

DROP FUNCTION IF EXISTS public.mark_conversation_as_read(conv_id BIGINT, target_user_id INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.mark_conversation_as_read(conv_id BIGINT, target_user_id TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.mark_conversation_as_read(BIGINT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.mark_conversation_as_read(BIGINT, TEXT) CASCADE;

-- 2. Recreate only the INTEGER versions (final, clean versions)
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(target_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
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

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id INTEGER, user2_id INTEGER)
RETURNS BIGINT AS $$
DECLARE
    conv_id BIGINT;
BEGIN
    -- Try to find existing conversation between these two users
    SELECT c.id INTO conv_id
    FROM public.conversations c
    WHERE c.is_group = false
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
    
    -- If conversation exists, return it
    IF conv_id IS NOT NULL THEN
        RETURN conv_id;
    END IF;
    
    -- Create new conversation
    INSERT INTO public.conversations (is_group) VALUES (false) RETURNING id INTO conv_id;
    
    -- Add participants
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES 
        (conv_id, user1_id),
        (conv_id, user2_id);
    
    RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(conv_id BIGINT, target_user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mark all unread messages in this conversation as read
    INSERT INTO public.message_reads (message_id, user_id)
    SELECT m.id, target_user_id
    FROM public.messages m
    WHERE m.conversation_id = conv_id
    AND m.sender_id != target_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.message_reads mr 
        WHERE mr.message_id = m.id AND mr.user_id = target_user_id
    );
    
    -- Update last_read_at for this user in this conversation
    UPDATE public.conversation_participants 
    SET last_read_at = NOW()
    WHERE conversation_id = conv_id AND user_id = target_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Success message
SELECT 'Function overloading conflicts resolved!' as result; 