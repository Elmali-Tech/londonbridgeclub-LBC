-- Partners tablosu için SQL şeması

-- Partners tablosu
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  logo_key VARCHAR(255),
  website_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index ekleyelim
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);

-- RLS (Row Level Security) Aktif Et
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Politika oluşturalım
-- partners tablosu için okuma politikası - herkes görebilir
CREATE POLICY "Herkes partner listesini görebilir" ON partners
  FOR SELECT USING (true);

-- partners tablosu için ekleme politikası - sadece admin kullanıcılar ekleyebilir
CREATE POLICY "Sadece admin kullanıcılar partner ekleyebilir" ON partners
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT user_id FROM sessions WHERE sessions.token = current_setting('request.jwt.token', true))
      AND users.is_admin = true
    )
  );

-- partners tablosu için güncelleme politikası - sadece admin kullanıcılar güncelleyebilir
CREATE POLICY "Sadece admin kullanıcılar partner güncelleyebilir" ON partners
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT user_id FROM sessions WHERE sessions.token = current_setting('request.jwt.token', true))
      AND users.is_admin = true
    )
  );

-- partners tablosu için silme politikası - sadece admin kullanıcılar silebilir
CREATE POLICY "Sadece admin kullanıcılar partner silebilir" ON partners
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT user_id FROM sessions WHERE sessions.token = current_setting('request.jwt.token', true))
      AND users.is_admin = true
    )
  ); 