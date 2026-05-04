-- NEW MESSAGING SYSTEM - Clean and Simple Implementation
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

BEGIN;

-- 1. DROP existing messaging tables if they exist
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;

-- 2. CHATS Table - Ana sohbet tablosu
CREATE TABLE public.chats (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    name VARCHAR(255), -- Grup sohbetleri için
    description TEXT, -- Grup açıklaması
    avatar_key VARCHAR(500), -- S3 key for group avatar
    created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Son mesaj bilgileri (performans için denormalize)
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    
    -- Soft delete ve aktiflik durumu
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. CHAT_PARTICIPANTS Table - Sohbet katılımcıları
CREATE TABLE public.chat_participants (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    
    -- Katılım bilgileri
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Her kullanıcı bir sohbette sadece bir kez olabilir
    UNIQUE(chat_id, user_id)
);

-- 4. MESSAGES Table - Mesajlar
CREATE TABLE public.messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Mesaj içeriği
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    
    -- Dosya bilgileri (S3 entegrasyonu için)
    file_key VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    
    -- Yanıt mesajı referansı
    reply_to_id BIGINT REFERENCES public.messages(id) ON DELETE SET NULL,
    
    -- Mesaj durumu
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MESSAGE_READS Table - Mesaj okunma durumu (opsiyonel)
CREATE TABLE public.message_reads (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Her kullanıcı bir mesajı sadece bir kez okuyabilir
    UNIQUE(message_id, user_id)
);

-- 5. CREATE INDEXES for Performance
CREATE INDEX idx_chats_type ON public.chats(type);
CREATE INDEX idx_chats_created_by ON public.chats(created_by);
CREATE INDEX idx_chats_updated_at ON public.chats(updated_at DESC);
CREATE INDEX idx_chats_last_message_at ON public.chats(last_message_at DESC);

CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_active ON public.chat_participants(is_active);

CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_type ON public.messages(message_type);
CREATE INDEX idx_messages_deleted ON public.messages(is_deleted);

CREATE INDEX idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);

-- 6. DISABLE RLS (Custom auth sistemi kullandığımız için)
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads DISABLE ROW LEVEL SECURITY;

-- 7. HELPER FUNCTIONS

-- Direkt sohbet oluştur veya mevcut olanı bul
CREATE OR REPLACE FUNCTION get_or_create_direct_chat(user1_id INTEGER, user2_id INTEGER)
RETURNS BIGINT AS $$
DECLARE
    chat_id BIGINT;
BEGIN
    -- Mevcut direkt sohbeti ara
    SELECT c.id INTO chat_id
    FROM chats c
    WHERE c.type = 'direct'
    AND c.is_active = true
    AND EXISTS (
        SELECT 1 FROM chat_participants cp1 
        WHERE cp1.chat_id = c.id 
        AND cp1.user_id = user1_id 
        AND cp1.is_active = true
    )
    AND EXISTS (
        SELECT 1 FROM chat_participants cp2 
        WHERE cp2.chat_id = c.id 
        AND cp2.user_id = user2_id 
        AND cp2.is_active = true
    )
    AND (
        SELECT COUNT(*) FROM chat_participants cp 
        WHERE cp.chat_id = c.id AND cp.is_active = true
    ) = 2;
    
    -- Eğer mevcut sohbet varsa, onu döndür
    IF chat_id IS NOT NULL THEN
        RETURN chat_id;
    END IF;
    
    -- Yeni direkt sohbet oluştur
    INSERT INTO chats (type, created_by) 
    VALUES ('direct', user1_id) 
    RETURNING id INTO chat_id;
    
    -- Katılımcıları ekle
    INSERT INTO chat_participants (chat_id, user_id, role) 
    VALUES 
        (chat_id, user1_id, 'member'),
        (chat_id, user2_id, 'member');
    
    RETURN chat_id;
END;
$$ LANGUAGE plpgsql;

-- OPTIMIZED: Kullanıcının tüm chat'lerini tek sorguda getir
CREATE OR REPLACE FUNCTION get_user_chats_optimized(target_user_id INTEGER)
RETURNS TABLE(
    chat_id BIGINT,
    chat_type VARCHAR,
    chat_name VARCHAR,
    chat_description TEXT,
    chat_avatar_key VARCHAR,
    chat_created_by INTEGER,
    chat_created_at TIMESTAMP WITH TIME ZONE,
    chat_updated_at TIMESTAMP WITH TIME ZONE,
    chat_last_message_at TIMESTAMP WITH TIME ZONE,
    chat_last_message_preview TEXT,
    chat_is_active BOOLEAN,
    participant_id BIGINT,
    participant_user_id INTEGER,
    participant_role VARCHAR,
    participant_joined_at TIMESTAMP WITH TIME ZONE,
    participant_last_seen_at TIMESTAMP WITH TIME ZONE,
    participant_is_active BOOLEAN,
    user_full_name VARCHAR,
    user_headline VARCHAR,
    user_profile_image_key VARCHAR,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as chat_id,
        c.type as chat_type,
        c.name as chat_name,
        c.description as chat_description,
        c.avatar_key as chat_avatar_key,
        c.created_by as chat_created_by,
        c.created_at as chat_created_at,
        c.updated_at as chat_updated_at,
        c.last_message_at as chat_last_message_at,
        c.last_message_preview as chat_last_message_preview,
        c.is_active as chat_is_active,
        cp.id as participant_id,
        cp.user_id as participant_user_id,
        cp.role as participant_role,
        cp.joined_at as participant_joined_at,
        cp.last_seen_at as participant_last_seen_at,
        cp.is_active as participant_is_active,
        u.full_name as user_full_name,
        u.headline as user_headline,
        u.profile_image_key as user_profile_image_key,
        COALESCE(unread.count, 0) as unread_count
    FROM chats c
    INNER JOIN chat_participants user_cp ON c.id = user_cp.chat_id 
        AND user_cp.user_id = target_user_id 
        AND user_cp.is_active = true
    LEFT JOIN chat_participants cp ON c.id = cp.chat_id AND cp.is_active = true
    LEFT JOIN users u ON cp.user_id = u.id
    LEFT JOIN (
        SELECT 
            m.chat_id,
            COUNT(DISTINCT m.id) as count
        FROM messages m
        WHERE m.sender_id != target_user_id
        AND m.is_deleted = false
        AND NOT EXISTS (
            SELECT 1 FROM message_reads mr 
            WHERE mr.message_id = m.id 
            AND mr.user_id = target_user_id
        )
        GROUP BY m.chat_id
    ) unread ON c.id = unread.chat_id
    WHERE c.is_active = true
    ORDER BY 
        COALESCE(c.last_message_at, c.created_at) DESC,
        c.id,
        cp.id;
END;
$$ LANGUAGE plpgsql;

-- Kullanıcının okunmamış mesaj sayısını getir
CREATE OR REPLACE FUNCTION get_user_unread_count(target_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT m.id)::INTEGER INTO unread_count
    FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE cp.user_id = target_user_id
    AND cp.is_active = true
    AND m.sender_id != target_user_id
    AND m.is_deleted = false
    AND NOT EXISTS (
        SELECT 1 FROM message_reads mr 
        WHERE mr.message_id = m.id 
        AND mr.user_id = target_user_id
    );
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Sohbeti okundu olarak işaretle
CREATE OR REPLACE FUNCTION mark_chat_as_read(target_chat_id BIGINT, target_user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Okunmamış mesajları okundu olarak işaretle
    INSERT INTO message_reads (message_id, user_id)
    SELECT m.id, target_user_id
    FROM messages m
    WHERE m.chat_id = target_chat_id
    AND m.sender_id != target_user_id
    AND m.is_deleted = false
    AND NOT EXISTS (
        SELECT 1 FROM message_reads mr 
        WHERE mr.message_id = m.id 
        AND mr.user_id = target_user_id
    );
    
    -- Kullanıcının son görülme zamanını güncelle
    UPDATE chat_participants 
    SET last_seen_at = NOW()
    WHERE chat_id = target_chat_id 
    AND user_id = target_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGERS

-- Yeni mesaj geldiğinde sohbeti güncelle
CREATE OR REPLACE FUNCTION update_chat_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = CASE 
            WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
            WHEN NEW.message_type = 'image' THEN '📷 Resim gönderildi'
            WHEN NEW.message_type = 'file' THEN '📄 ' || COALESCE(NEW.file_name, 'Dosya gönderildi')
            WHEN NEW.message_type = 'system' THEN NEW.content
            ELSE 'Mesaj gönderildi'
        END,
        updated_at = NEW.created_at
    WHERE id = NEW.chat_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_on_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_on_new_message();

-- Katılımcı değiştiğinde sohbeti güncelle
CREATE OR REPLACE FUNCTION update_chat_on_participant_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.chat_id, OLD.chat_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_on_participant_insert_trigger
    AFTER INSERT ON chat_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_on_participant_change();

CREATE TRIGGER update_chat_on_participant_update_trigger
    AFTER UPDATE ON chat_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_on_participant_change();

COMMIT;

-- Success message
SELECT 'Optimized messaging system created successfully!' as result; 