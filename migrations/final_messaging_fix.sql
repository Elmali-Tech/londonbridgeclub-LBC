-- FINAL MESSAGING SYSTEM FIX - Complete Rebuild for Integer User System
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

BEGIN;

-- 1. COMPLETELY DROP EXISTING MESSAGING SYSTEM
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Drop all functions and triggers
DROP FUNCTION IF EXISTS get_or_create_conversation(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_unread_messages_count(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS mark_conversation_as_read(BIGINT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS set_config(text, text) CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_participant_change() CASCADE;

-- 2. CREATE NEW MESSAGING SYSTEM WITH PROPER INTEGER USER IDS
-- Conversations Table
CREATE TABLE public.conversations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_preview TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  group_name VARCHAR(255),
  group_avatar_key VARCHAR(255)
);

-- Conversation Participants Table - INTEGER user_id referencing public.users
CREATE TABLE public.conversation_participants (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Messages Table - INTEGER sender_id referencing public.users
CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_key VARCHAR(255),
  attachment_name VARCHAR(255),
  attachment_size INTEGER,
  attachment_type VARCHAR(100),
  reply_to_id BIGINT REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Read Status - INTEGER user_id referencing public.users
CREATE TABLE public.message_reads (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- 3. CREATE INDEXES
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);
CREATE INDEX idx_message_reads_message_id ON public.message_reads(message_id);

-- 4. DISABLE RLS (Since we use custom auth, not Supabase auth)
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
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

-- 5. CREATE HELPER FUNCTIONS FOR INTEGER USER SYSTEM
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

-- 6. CREATE TRIGGERS FOR AUTOMATIC UPDATES
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Resim'
      WHEN NEW.message_type = 'file' THEN '📄 Dosya'
      ELSE 'Mesaj'
    END,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

CREATE OR REPLACE FUNCTION update_conversation_on_participant_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_participant_insert_trigger
  AFTER INSERT ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_participant_change();

CREATE TRIGGER update_conversation_on_participant_delete_trigger
  AFTER DELETE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_participant_change();

COMMIT;

-- Success message
SELECT 'Messaging system completely rebuilt for integer user system!' as result; 