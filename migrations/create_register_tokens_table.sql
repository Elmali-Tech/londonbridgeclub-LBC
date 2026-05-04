-- Register Tokens Table
-- Admin tarafından oluşturulan kayıt token'ları
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

CREATE TABLE IF NOT EXISTS public.register_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_register_tokens_token ON public.register_tokens(token);
CREATE INDEX IF NOT EXISTS idx_register_tokens_email ON public.register_tokens(email);
CREATE INDEX IF NOT EXISTS idx_register_tokens_used ON public.register_tokens(used);
CREATE INDEX IF NOT EXISTS idx_register_tokens_created_by ON public.register_tokens(created_by);

-- Bu tabloda Supabase RLS yerine uygulama seviyesinde yetkilendirme kullanıyoruz
ALTER TABLE public.register_tokens DISABLE ROW LEVEL SECURITY;

