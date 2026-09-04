-- Commission lifecycle on each person's share: a status plus the dates and notes
-- that go with it. Each individual commission moves Pending → Approved → Paid.

ALTER TABLE project_commission_shares
  ADD COLUMN IF NOT EXISTS status    VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Paid')),
  ADD COLUMN IF NOT EXISTS due_date  DATE,
  ADD COLUMN IF NOT EXISTS paid_date DATE,
  ADD COLUMN IF NOT EXISTS notes     TEXT;

CREATE INDEX IF NOT EXISTS idx_pcs_status ON project_commission_shares(status);
