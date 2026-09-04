-- Person-based commission: split a project's total commission among multiple people,
-- each with a percentage share. A person's £ amount is derived as
--   share_percentage * project.commission_amount / 100
-- so it always stays consistent with the project total (not stored here).
--
-- The sum of shares per project must never exceed 100% — enforced in the admin API.
-- Separate from project_team_members: entitlement to commission is not the same as
-- being on the delivery team.

CREATE TABLE IF NOT EXISTS project_commission_shares (
  id               BIGSERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id          INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  share_percentage NUMERIC(5,2) NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pcs_project_id ON project_commission_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_pcs_user_id    ON project_commission_shares(user_id);

ALTER TABLE project_commission_shares ENABLE ROW LEVEL SECURITY;
