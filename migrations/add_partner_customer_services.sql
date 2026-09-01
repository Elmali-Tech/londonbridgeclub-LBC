-- 1. Link customers to partners
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_partner_id ON customers(partner_id);

-- 2. Services: own record linked to both a partner and a customer
CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  partner_id  INTEGER       NOT NULL REFERENCES partners(id)  ON DELETE CASCADE,
  customer_id INTEGER       NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status      VARCHAR(50)   NOT NULL DEFAULT 'active',
  created_by  INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_partner_id  ON services(partner_id);
CREATE INDEX IF NOT EXISTS idx_services_customer_id ON services(customer_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
