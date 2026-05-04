-- Messaging System Schema - Fixed Version
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- First, drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Drop existing functions if they exist (this will also drop their triggers)
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_participant_change() CASCADE;

-- 1. Conversations Table (Konuşmalar)
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

-- 2. Conversation Participants Table (Konuşma Katılımcıları)
CREATE TABLE public.conversation_participants (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Supabase auth.users.id reference
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Uniqueness constraint: Her kullanıcı bir konuşmada sadece bir kez olabilir
  UNIQUE(conversation_id, user_id)
);

-- 3. Messages Table (Mesajlar)
CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL, -- Supabase auth.users.id reference
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_key VARCHAR(255), -- S3 key for attachments
  attachment_name VARCHAR(255),
  attachment_size INTEGER,
  attachment_type VARCHAR(100),
  reply_to_id BIGINT REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Message Read Status (Mesaj Okunma Durumu)
CREATE TABLE public.message_reads (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Uniqueness constraint: Her kullanıcı bir mesajı sadece bir kez okuyabilir
  UNIQUE(message_id, user_id)
);

-- 5. Indexes for Performance
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);
CREATE INDEX idx_message_reads_message_id ON public.message_reads(message_id);

-- 6. Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Conversations
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()::text
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
      AND cp.user_id = auth.uid()::text
    )
  );

-- 8. RLS Policies for Conversation Participants
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can add participants to conversations they're in"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid()::text);

-- 9. RLS Policies for Messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can send messages to conversations they're in"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid()::text);

-- 10. RLS Policies for Message Reads
CREATE POLICY "Users can view read status in their conversations"
  ON public.message_reads FOR SELECT
  USING (
    user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_reads.message_id
      AND cp.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON public.message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- 11. Trigger Functions
-- Update conversation last_message_at and preview when new message added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
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

-- Create trigger
CREATE TRIGGER update_conversation_on_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Update conversation updated_at when participant joins/leaves
CREATE OR REPLACE FUNCTION update_conversation_on_participant_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for participant changes
CREATE TRIGGER update_conversation_on_participant_insert_trigger
  AFTER INSERT ON public.conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_participant_change();

CREATE TRIGGER update_conversation_on_participant_delete_trigger
  AFTER DELETE ON public.conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_participant_change();

-- Success message
SELECT 'Messaging system tables created successfully!' as result; 