-- Commission Rates: a reusable library of named commission percentages managed
-- from the Admin Panel. Internal CRM data only, never public-facing — default-deny
-- RLS, same as every other CRM table; all access goes through the service-role admin API.
--
-- Rates are DEACTIVATED (is_active = false), never deleted, so historical projects
-- that referenced a rate keep their meaning.

CREATE TABLE IF NOT EXISTS commission_rates (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  percentage  NUMERIC(5,2)  NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_by  INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rates_active ON commission_rates(is_active);

ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
