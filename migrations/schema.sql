-- Supabase tabloları için SQL şeması

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'personal' CHECK (status IN ('personal', 'corporate')),
  linkedin_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Oturumlar tablosu
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index ekleyelim
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Politika oluşturalım
-- users tablosu için okuma politikası
CREATE POLICY "Herkes kullanıcı listesini görebilir" ON users
  FOR SELECT USING (true);

-- users tablosu için ekleme politikası
CREATE POLICY "Kullanıcılar kendilerini ekleyebilir" ON users
  FOR INSERT WITH CHECK (true);

-- users tablosu için düzenleme politikası
CREATE POLICY "Kullanıcılar kendi bilgilerini düzenleyebilir" ON users
  FOR UPDATE USING (auth.uid() = id);

-- sessions tablosu için okuma politikası
CREATE POLICY "Kullanıcılar kendi oturumlarını görebilir" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

-- sessions tablosu için ekleme politikası
CREATE POLICY "Kullanıcılar oturum oluşturabilir" ON sessions
  FOR INSERT WITH CHECK (true);

-- sessions tablosu için silme politikası
CREATE POLICY "Kullanıcılar kendi oturumlarını silebilir" ON sessions
  FOR DELETE USING (auth.uid() = user_id); 