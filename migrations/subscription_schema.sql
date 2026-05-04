-- Kullanıcı tablosunu güncelle
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);

-- Abonelikler tablosu
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('personal', 'corporate')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- RLS aktivasyonu
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Politikalar oluşturalım
CREATE POLICY "Kullanıcılar kendi aboneliklerini görebilir" ON subscriptions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Kullanıcılar kendi aboneliklerini ekleyebilir" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Kullanıcılar kendi aboneliklerini güncelleyebilir" ON subscriptions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Admin için tam erişim politikası (Webhook ve sunucu taraflı işlemler için)
CREATE POLICY "Servis rolü tam erişim" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role'); 