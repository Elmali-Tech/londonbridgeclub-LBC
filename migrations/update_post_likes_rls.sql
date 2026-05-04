-- Önce mevcut politikaları kaldır
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
DROP POLICY IF EXISTS "Post owners can see who liked their posts" ON public.post_likes;
DROP POLICY IF EXISTS "Allow inserts for authenticated users" ON public.post_likes;
DROP POLICY IF EXISTS "Allow deletes of own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Allow selects for authenticated users" ON public.post_likes;

-- RLS'i etkinleştir ama herkes için izin ver
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Her şeye izin veren tek bir politika ekle (geliştirme için)
CREATE POLICY "Allow all operations for all users"
  ON public.post_likes
  USING (true)
  WITH CHECK (true);

-- alternatif olarak RLS'i devre dışı bırakmak da bir seçenek 
-- (ancak bunu sadece geliştirme ortamında yapın!)
-- ALTER TABLE public.post_likes DISABLE ROW LEVEL SECURITY; 