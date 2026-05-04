-- ================================================================
-- Membership Plans Schema Migration
-- Yeni üyelik planları altyapısı
-- ================================================================

-- 1. Üyelik planları tablosu
CREATE TABLE IF NOT EXISTS membership_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('individual', 'corporate')),
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_monthly_price_id VARCHAR(255),
  stripe_yearly_price_id VARCHAR(255),
  entry_fee_early DECIMAL(10,2) NOT NULL DEFAULT 0,
  entry_fee_standard DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  highlighted BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Özellik tanımları tablosu
CREATE TABLE IF NOT EXISTS plan_features (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  value_type VARCHAR(20) NOT NULL DEFAULT 'boolean' CHECK (value_type IN ('boolean', 'text')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Plan başına özellik değerleri tablosu
CREATE TABLE IF NOT EXISTS plan_feature_values (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  feature_id INTEGER NOT NULL REFERENCES plan_features(id) ON DELETE CASCADE,
  is_included BOOLEAN NOT NULL DEFAULT false,
  text_value VARCHAR(255),
  UNIQUE(plan_id, feature_id)
);

-- 4. Giriş bedeli ayarları (tek satır tablo)
CREATE TABLE IF NOT EXISTS entry_fee_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_active BOOLEAN NOT NULL DEFAULT false,
  threshold INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Subscriptions tablosunu güncelle
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES membership_plans(id),
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS entry_fee_paid DECIMAL(10,2) DEFAULT 0;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_membership_plans_slug ON membership_plans(slug);
CREATE INDEX IF NOT EXISTS idx_membership_plans_category ON membership_plans(category);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_feature_values_plan_id ON plan_feature_values(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_feature_values_feature_id ON plan_feature_values(feature_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

-- ================================================================
-- Seed Data: 6 Plan
-- ================================================================
INSERT INTO membership_plans (name, slug, category, monthly_price, yearly_price, entry_fee_early, entry_fee_standard, is_active, highlighted, sort_order)
VALUES
  ('Bronze',   'bronze',   'individual', 100,  1100,  0, 1000, true, false, 1),
  ('Silver',   'silver',   'individual', 250,  2750,  0, 1000, true, true,  2),
  ('Gold',     'gold',     'individual', 500,  5500,  0, 1000, true, false, 3),
  ('Platinum', 'platinum', 'corporate',  250,  2750,  0, 2000, true, false, 4),
  ('Emerald',  'emerald',  'corporate',  500,  5500,  0, 2000, true, true,  5),
  ('Diamond',  'diamond',  'corporate',  1000, 11000, 0, 2000, true, false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- Seed Data: 15 Özellik
-- ================================================================
INSERT INTO plan_features (key, label, value_type, sort_order)
VALUES
  ('lbc_membership',       'LBC Membership',                   'boolean', 1),
  ('network',              'Network',                          'boolean', 2),
  ('office_usage',         'Office Usage (Tea & Coffee incl.)', 'text',   3),
  ('lbc_card',             'LBC Card',                         'boolean', 4),
  ('lbc_kit',              'LBC Kit',                          'boolean', 5),
  ('representative_count', 'Representatives',                  'text',    6),
  ('vip_transfer',         'VIP Vehicle Transfer',             'text',    7),
  ('lbc_event',            'LBC Event Access',                 'boolean', 8),
  ('special_event',        'Special Event Access',             'boolean', 9),
  ('assistance_service',   'Assistance Service',               'boolean', 10),
  ('concierge',            'Concierge',                        'boolean', 11),
  ('health_insurance',     'Health Insurance',                 'boolean', 12),
  ('lounge_usage',         'Lounge Access',                    'text',    13),
  ('fast_track',           'Fast Track',                       'text',    14),
  ('esim_card',            'E-SIM Card',                       'text',    15)
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- Seed Data: Özellik Değerleri
-- ================================================================
DO $$
DECLARE
  bronze_id   INTEGER;
  silver_id   INTEGER;
  gold_id     INTEGER;
  plat_id     INTEGER;
  emer_id     INTEGER;
  diam_id     INTEGER;

  f_lbc_mem   INTEGER;
  f_network   INTEGER;
  f_office    INTEGER;
  f_card      INTEGER;
  f_kit       INTEGER;
  f_rep       INTEGER;
  f_vip       INTEGER;
  f_lbc_ev    INTEGER;
  f_spec_ev   INTEGER;
  f_assist    INTEGER;
  f_concierge INTEGER;
  f_health    INTEGER;
  f_lounge    INTEGER;
  f_fast      INTEGER;
  f_esim      INTEGER;
BEGIN
  SELECT id INTO bronze_id FROM membership_plans WHERE slug = 'bronze';
  SELECT id INTO silver_id FROM membership_plans WHERE slug = 'silver';
  SELECT id INTO gold_id   FROM membership_plans WHERE slug = 'gold';
  SELECT id INTO plat_id   FROM membership_plans WHERE slug = 'platinum';
  SELECT id INTO emer_id   FROM membership_plans WHERE slug = 'emerald';
  SELECT id INTO diam_id   FROM membership_plans WHERE slug = 'diamond';

  SELECT id INTO f_lbc_mem   FROM plan_features WHERE key = 'lbc_membership';
  SELECT id INTO f_network   FROM plan_features WHERE key = 'network';
  SELECT id INTO f_office    FROM plan_features WHERE key = 'office_usage';
  SELECT id INTO f_card      FROM plan_features WHERE key = 'lbc_card';
  SELECT id INTO f_kit       FROM plan_features WHERE key = 'lbc_kit';
  SELECT id INTO f_rep       FROM plan_features WHERE key = 'representative_count';
  SELECT id INTO f_vip       FROM plan_features WHERE key = 'vip_transfer';
  SELECT id INTO f_lbc_ev    FROM plan_features WHERE key = 'lbc_event';
  SELECT id INTO f_spec_ev   FROM plan_features WHERE key = 'special_event';
  SELECT id INTO f_assist    FROM plan_features WHERE key = 'assistance_service';
  SELECT id INTO f_concierge FROM plan_features WHERE key = 'concierge';
  SELECT id INTO f_health    FROM plan_features WHERE key = 'health_insurance';
  SELECT id INTO f_lounge    FROM plan_features WHERE key = 'lounge_usage';
  SELECT id INTO f_fast      FROM plan_features WHERE key = 'fast_track';
  SELECT id INTO f_esim      FROM plan_features WHERE key = 'esim_card';

  -- BRONZE
  INSERT INTO plan_feature_values (plan_id, feature_id, is_included, text_value) VALUES
    (bronze_id, f_lbc_mem,   true,  NULL),
    (bronze_id, f_network,   true,  NULL),
    (bronze_id, f_office,    true,  '1 day/week'),
    (bronze_id, f_card,      true,  NULL),
    (bronze_id, f_kit,       true,  NULL),
    (bronze_id, f_rep,       true,  '1 person'),
    (bronze_id, f_vip,       true,  '2x / year'),
    (bronze_id, f_lbc_ev,    true,  NULL),
    (bronze_id, f_spec_ev,   false, NULL),
    (bronze_id, f_assist,    false, NULL),
    (bronze_id, f_concierge, true,  NULL),
    (bronze_id, f_health,    false, NULL),
    (bronze_id, f_lounge,    true,  '2x / year'),
    (bronze_id, f_fast,      true,  '2x / year'),
    (bronze_id, f_esim,      true,  '2x / year')
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- SILVER
  INSERT INTO plan_feature_values (plan_id, feature_id, is_included, text_value) VALUES
    (silver_id, f_lbc_mem,   true,  NULL),
    (silver_id, f_network,   true,  NULL),
    (silver_id, f_office,    true,  '2 days/week'),
    (silver_id, f_card,      true,  NULL),
    (silver_id, f_kit,       true,  NULL),
    (silver_id, f_rep,       true,  '1 person'),
    (silver_id, f_vip,       true,  '5x / year'),
    (silver_id, f_lbc_ev,    true,  NULL),
    (silver_id, f_spec_ev,   false, NULL),
    (silver_id, f_assist,    false, NULL),
    (silver_id, f_concierge, true,  NULL),
    (silver_id, f_health,    true,  NULL),
    (silver_id, f_lounge,    true,  '4x / year'),
    (silver_id, f_fast,      true,  '4x / year'),
    (silver_id, f_esim,      true,  '5x / year')
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- GOLD
  INSERT INTO plan_feature_values (plan_id, feature_id, is_included, text_value) VALUES
    (gold_id, f_lbc_mem,   true, NULL),
    (gold_id, f_network,   true, NULL),
    (gold_id, f_office,    true, '3 days/week'),
    (gold_id, f_card,      true, NULL),
    (gold_id, f_kit,       true, NULL),
    (gold_id, f_rep,       true, '2 people'),
    (gold_id, f_vip,       true, '12x / year'),
    (gold_id, f_lbc_ev,    true, NULL),
    (gold_id, f_spec_ev,   true, NULL),
    (gold_id, f_assist,    true, NULL),
    (gold_id, f_concierge, true, NULL),
    (gold_id, f_health,    true, NULL),
    (gold_id, f_lounge,    true, '6x / year'),
    (gold_id, f_fast,      true, '6x / year'),
    (gold_id, f_esim,      true, '12x / year')
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- PLATINUM
  INSERT INTO plan_feature_values (plan_id, feature_id, is_included, text_value) VALUES
    (plat_id, f_lbc_mem,   true,  NULL),
    (plat_id, f_network,   true,  NULL),
    (plat_id, f_office,    true,  '2 days/week'),
    (plat_id, f_card,      true,  NULL),
    (plat_id, f_kit,       true,  NULL),
    (plat_id, f_rep,       true,  '1 person'),
    (plat_id, f_vip,       true,  '6x / year'),
    (plat_id, f_lbc_ev,    true,  NULL),
    (plat_id, f_spec_ev,   false, NULL),
    (plat_id, f_assist,    false, NULL),
    (plat_id, f_concierge, true,  NULL),
    (plat_id, f_health,    true,  NULL),
    (plat_id, f_lounge,    true,  '4x / year'),
    (plat_id, f_fast,      true,  '4x / year'),
    (plat_id, f_esim,      true,  '6x / year')
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- EMERALD
  INSERT INTO plan_feature_values (plan_id, feature_id, is_included, text_value) VALUES
    (emer_id, f_lbc_mem,   true, NULL),
    (emer_id, f_network,   true, NULL),
    (emer_id, f_office,    true, '3 days/week'),
    (emer_id, f_card,      true, NULL),
    (emer_id, f_kit,       true, NULL),
    (emer_id, f_rep,       true, '2 people'),
    (emer_id, f_vip,       true, '15x / year'),
    (emer_id, f_lbc_ev,    true, NULL),
    (emer_id, f_spec_ev,   true, NULL),
    (emer_id, f_assist,    true, NULL),
    (emer_id, f_concierge, true, NULL),
    (emer_id, f_health,    true, NULL),
    (emer_id, f_lounge,    true, '6x / year'),
    (emer_id, f_fast,      true, '6x / year'),
    (emer_id, f_esim,      true, '15x / year')
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- DIAMOND
  INSERT INTO plan_feature_values (plan_id, feature_id, is_included, text_value) VALUES
    (diam_id, f_lbc_mem,   true, NULL),
    (diam_id, f_network,   true, NULL),
    (diam_id, f_office,    true, '5 days/week'),
    (diam_id, f_card,      true, NULL),
    (diam_id, f_kit,       true, NULL),
    (diam_id, f_rep,       true, '5 people'),
    (diam_id, f_vip,       true, '40x / year'),
    (diam_id, f_lbc_ev,    true, NULL),
    (diam_id, f_spec_ev,   true, NULL),
    (diam_id, f_assist,    true, NULL),
    (diam_id, f_concierge, true, NULL),
    (diam_id, f_health,    true, NULL),
    (diam_id, f_lounge,    true, '12x / year'),
    (diam_id, f_fast,      true, '12x / year'),
    (diam_id, f_esim,      true, '40x / year')
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

END $$;

-- Giriş bedeli varsayılan ayarı
INSERT INTO entry_fee_settings (id, is_active, threshold)
VALUES (1, false, 50)
ON CONFLICT (id) DO NOTHING;

-- Mevcut abonelikleri yeni plan_id'ye migrate et
UPDATE subscriptions
SET
  plan_id = (SELECT id FROM membership_plans WHERE slug = 'bronze'),
  billing_cycle = 'monthly'
WHERE plan_type = 'personal' AND plan_id IS NULL;

UPDATE subscriptions
SET
  plan_id = (SELECT id FROM membership_plans WHERE slug = 'platinum'),
  billing_cycle = 'monthly'
WHERE plan_type = 'corporate' AND plan_id IS NULL;

-- RLS devre dışı (custom JWT auth kullanılıyor)
-- Tablolar service_role key ile erişiliyor
