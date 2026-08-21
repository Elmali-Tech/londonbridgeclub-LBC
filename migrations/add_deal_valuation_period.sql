ALTER TABLE customer_opportunities
  ADD COLUMN IF NOT EXISTS deal_valuation_period VARCHAR(32) DEFAULT 'one_time';

UPDATE customer_opportunities
SET deal_valuation_period = 'one_time'
WHERE deal_valuation_period IS NULL;

ALTER TABLE customer_opportunities
  ALTER COLUMN deal_valuation_period SET DEFAULT 'one_time',
  ALTER COLUMN deal_valuation_period SET NOT NULL;

ALTER TABLE customer_opportunities
  DROP CONSTRAINT IF EXISTS customer_opportunities_deal_valuation_period_check;

ALTER TABLE customer_opportunities
  ADD CONSTRAINT customer_opportunities_deal_valuation_period_check
  CHECK (
    deal_valuation_period IN (
      'one_time',
      'monthly',
      'quarterly',
      'six_months',
      'annual'
    )
  );

COMMENT ON COLUMN customer_opportunities.deal_valuation_period
  IS 'Cadence of the estimated deal valuation: one_time, monthly, quarterly, six_months, annual.';
