-- Yorumlara beğeni ekleme için tablo
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id BIGSERIAL PRIMARY KEY,
  comment_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Benzersizlik kısıtı - bir kullanıcı bir yorumu sadece bir kez beğenebilir
  UNIQUE(comment_id, user_id),
  
  -- İlişkiler
  CONSTRAINT fk_comment
    FOREIGN KEY(comment_id)
    REFERENCES public.comments(id)
    ON DELETE CASCADE
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

-- RLS ayarları - geliştirme için her şeye izin veriyoruz
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on comment_likes"
  ON public.comment_likes
  USING (true)
  WITH CHECK (true);

-- Yorumlar tablosuna likes_count kolonu ekle
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL; 