-- post_likes tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.post_likes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Uniqueness constraint: Her kullanıcı bir gönderiyi yalnızca bir kez beğenebilir
  UNIQUE(user_id, post_id),
  
  -- Foreign keys
  CONSTRAINT fk_post
    FOREIGN KEY(post_id)
    REFERENCES public.posts(id)
    ON DELETE CASCADE
);

-- İndeksler (hızlı sorgular için)
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);

-- RLS (Row Level Security) ayarları
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Herkes kendi beğenilerini oluşturabilir, okuyabilir ve silebilir
CREATE POLICY "Users can insert their own likes"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.post_likes FOR DELETE
  USING (auth.uid()::text = user_id);

-- Herkes beğenileri görebilir (feed ve post sayfaları için)
CREATE POLICY "Anyone can view likes"
  ON public.post_likes FOR SELECT
  USING (true);

-- Post sahibi kendi postlarındaki beğenileri görebilir
CREATE POLICY "Post owners can see who liked their posts"
  ON public.post_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_likes.post_id
      AND p.user_id::text = auth.uid()::text
    )
  ); 