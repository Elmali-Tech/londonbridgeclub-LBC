-- Restructure project commission from free-text into a rate-driven, computed model.
--
-- Clean slate: the old free-text `revenue`/`commission` VARCHAR columns are dropped
-- and replaced with numeric, structured fields.
--
--   revenue                NUMERIC  — project revenue (e.g. 50000.00)
--   commission_rate_id     INTEGER  — the chosen standard rate (NULL when custom)
--   custom_commission_rate NUMERIC  — a per-project override percentage (NULL when standard)
--   effective_rate         NUMERIC  — snapshot of the % actually used, so later edits to
--                                     a rate in the library never rewrite this project
--   commission_amount      NUMERIC  — computed by the API: revenue * effective_rate / 100

ALTER TABLE projects DROP COLUMN IF EXISTS revenue;
ALTER TABLE projects DROP COLUMN IF EXISTS commission;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revenue                NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS commission_rate_id     INTEGER REFERENCES commission_rates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_commission_rate NUMERIC(5,2) CHECK (custom_commission_rate IS NULL OR (custom_commission_rate >= 0 AND custom_commission_rate <= 100)),
  ADD COLUMN IF NOT EXISTS effective_rate         NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount      NUMERIC(14,2);

CREATE INDEX IF NOT EXISTS idx_projects_commission_rate_id ON projects(commission_rate_id);
