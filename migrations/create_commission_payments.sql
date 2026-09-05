-- Commission Payments: an immutable audit row written the first time a person's
-- commission share becomes Paid. Completes the §8 data model
--   Commission Rates → Projects → Commission Recipients → Payments / Status
-- The share itself still carries the current status + paid_date; this table is the
-- historical record of *who* recorded *what* payment and *when*, so a payout can be
-- traced even if the share is later reverted or its share % changes.
--
-- Amounts are written by the backend from project.commission_amount × share%,
-- never trusted from the client. Internal CRM data only — default-deny RLS, same as
-- every other CRM table; all access goes through the service-role admin API.

CREATE TABLE IF NOT EXISTS commission_payments (
  id                   BIGSERIAL PRIMARY KEY,
  commission_share_id  BIGINT  NOT NULL REFERENCES project_commission_shares(id) ON DELETE CASCADE,
  project_id           INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id              INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  amount               NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_date            DATE,
  recorded_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_payments_share_id ON commission_payments(commission_share_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_project_id ON commission_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_user_id ON commission_payments(user_id);

ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;
