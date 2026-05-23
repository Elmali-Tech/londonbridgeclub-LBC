-- Customer Pool reporting fields for reference and LBC commission tracking

ALTER TABLE customer_opportunities
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255),
  ADD COLUMN IF NOT EXISTS commission_rate VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lbc_commission VARCHAR(100);

