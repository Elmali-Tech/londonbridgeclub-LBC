-- Yorumlar tablosuna parent_id kolonu ekle
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id BIGINT DEFAULT NULL;

-- parent_id foreign key ilişkisi ekle
ALTER TABLE public.comments ADD CONSTRAINT fk_parent_comment 
  FOREIGN KEY (parent_id) 
  REFERENCES public.comments(id) 
  ON DELETE CASCADE;

-- Yanıtlar için indeks ekle
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id); 