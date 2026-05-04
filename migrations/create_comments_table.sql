-- Yorumlar tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- İlişkiler
  CONSTRAINT fk_post
    FOREIGN KEY(post_id)
    REFERENCES public.posts(id)
    ON DELETE CASCADE
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- RLS ayarları - geliştirme modu, herkese izin ver
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on comments"
  ON public.comments
  USING (true)
  WITH CHECK (true); 