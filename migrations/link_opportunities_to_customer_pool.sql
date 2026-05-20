-- Link member-facing opportunities back to the CRM customer pool.

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS customer_opportunity_id INTEGER REFERENCES customer_opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_customer_opportunity_id
  ON opportunities(customer_opportunity_id);

ALTER TABLE opportunity_interests
  ADD COLUMN IF NOT EXISTS customer_opportunity_id INTEGER REFERENCES customer_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted', 'dismissed')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS followed_up_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_opportunity_interests_customer_opportunity_id
  ON opportunity_interests(customer_opportunity_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_interests_status
  ON opportunity_interests(status);

UPDATE opportunity_interests AS interest
SET customer_opportunity_id = opportunity.customer_opportunity_id
FROM opportunities AS opportunity
WHERE interest.opportunity_id = opportunity.id
  AND interest.customer_opportunity_id IS NULL
  AND opportunity.customer_opportunity_id IS NOT NULL;

UPDATE customer_opportunities
SET deal_stage = 'Lead'
WHERE deal_stage IS NULL OR deal_stage = 'Prospect';

UPDATE customer_opportunities
SET deal_stage = 'Qualified'
WHERE deal_stage = 'Opportunity';
