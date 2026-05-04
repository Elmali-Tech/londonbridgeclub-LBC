-- Önce mevcut tabloyu yedekleyelim
CREATE TABLE IF NOT EXISTS public.connections_backup AS
SELECT * FROM public.connections;

-- Mevcut tabloyu düşürelim
DROP TABLE IF EXISTS public.connections;

-- Connections tablosunu tekrar oluşturalım, bu sefer doğru tiplerle ve foreign key kısıtlamalarıyla
CREATE TABLE IF NOT EXISTS public.connections (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Uniqueness constraint: Each follower can only follow someone once
  UNIQUE(follower_id, following_id)
);

-- Yedekten verileri geri yükleyelim (tip dönüşümü gerekecek)
INSERT INTO public.connections (follower_id, following_id, created_at)
SELECT 
  follower_id::BIGINT, 
  following_id::BIGINT, 
  created_at
FROM public.connections_backup
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Yedek tabloyu silelim
DROP TABLE IF EXISTS public.connections_backup;

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_connections_follower_id ON public.connections(follower_id);
CREATE INDEX IF NOT EXISTS idx_connections_following_id ON public.connections(following_id);

-- Enable Row Level Security
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Users can create their own connections (follow someone)
CREATE POLICY "Users can create their own connections"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid()::text = follower_id::text);

-- Users can delete their own connections (unfollow someone)
CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE
  USING (auth.uid()::text = follower_id::text);

-- Anyone can view connections (needed for profile pages and recommendations)
CREATE POLICY "Anyone can view connections"
  ON public.connections FOR SELECT
  USING (true); 