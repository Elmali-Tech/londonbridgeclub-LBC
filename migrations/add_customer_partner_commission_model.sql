-- Customer, partner linking and automatic LBC commission model.

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(80),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(7,4) DEFAULT 0;

ALTER TABLE customer_opportunities
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS record_type VARCHAR(50) DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS estimated_deal_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS lbc_commission_amount NUMERIC(14,2);

ALTER TABLE customer_opportunities
  DROP CONSTRAINT IF EXISTS customer_opportunities_record_type_check;

ALTER TABLE customer_opportunities
  ADD CONSTRAINT customer_opportunities_record_type_check
  CHECK (record_type IN ('lead', 'opportunity'));

CREATE INDEX IF NOT EXISTS idx_customer_opportunities_customer_id
  ON customer_opportunities(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_opportunities_partner_id
  ON customer_opportunities(partner_id);

CREATE INDEX IF NOT EXISTS idx_customer_opportunities_record_type
  ON customer_opportunities(record_type);

INSERT INTO customers (name, company_name, contact_person, created_by, created_at, updated_at)
SELECT
  source.customer_name,
  source.company_name,
  source.contact_person,
  source.created_by,
  source.created_at,
  source.updated_at
FROM (
  SELECT
    trim(customer_name) AS customer_name,
    nullif(trim(company_name), '') AS company_name,
    nullif(trim(contact_person), '') AS contact_person,
    created_by,
    created_at,
    updated_at,
    row_number() OVER (
      PARTITION BY lower(trim(customer_name)), lower(trim(coalesce(company_name, '')))
      ORDER BY created_at ASC
    ) AS row_number
  FROM customer_opportunities
  WHERE customer_id IS NULL
    AND nullif(trim(customer_name), '') IS NOT NULL
) AS source
WHERE source.row_number = 1
  AND NOT EXISTS (
    SELECT 1
    FROM customers AS existing_customer
    WHERE lower(trim(existing_customer.name)) = lower(trim(source.customer_name))
      AND coalesce(lower(trim(existing_customer.company_name)), '') =
          coalesce(lower(trim(source.company_name)), '')
  );

UPDATE customer_opportunities AS opportunity
SET customer_id = customer.id
FROM customers AS customer
WHERE opportunity.customer_id IS NULL
  AND lower(trim(opportunity.customer_name)) = lower(trim(customer.name))
  AND coalesce(lower(trim(opportunity.company_name)), '') =
      coalesce(lower(trim(customer.company_name)), '');

UPDATE customer_opportunities AS opportunity
SET partner_id = partner.id
FROM partners AS partner
WHERE opportunity.partner_id IS NULL
  AND lower(trim(opportunity.company_name)) = lower(trim(partner.name));
