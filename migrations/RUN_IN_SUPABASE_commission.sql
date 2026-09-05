-- =============================================================================
-- LBC Commission System — run this in the Supabase SQL editor.
-- One batch, fully idempotent, and NON-DESTRUCTIVE: no existing data is dropped.
-- Covers §9 (migrate legacy values) and §8 (payments audit table).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PART A (§9): move project revenue/commission from free-text VARCHAR to
-- structured numeric columns WITHOUT losing manually entered values.
-- Legacy text is preserved in *_legacy columns, then parsed and back-filled.
-- ---------------------------------------------------------------------------

-- 1. Preserve any existing free-text values by renaming (only if still text).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'projects' AND column_name = 'revenue'
               AND data_type IN ('character varying', 'text')) THEN
    ALTER TABLE projects RENAME COLUMN revenue TO revenue_legacy;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'projects' AND column_name = 'commission'
               AND data_type IN ('character varying', 'text')) THEN
    ALTER TABLE projects RENAME COLUMN commission TO commission_legacy;
  END IF;
END $$;

-- 2. Add the new structured numeric columns.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revenue                NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS commission_rate_id     INTEGER REFERENCES commission_rates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_commission_rate NUMERIC(5,2) CHECK (custom_commission_rate IS NULL OR (custom_commission_rate >= 0 AND custom_commission_rate <= 100)),
  ADD COLUMN IF NOT EXISTS effective_rate         NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount      NUMERIC(14,2);

CREATE INDEX IF NOT EXISTS idx_projects_commission_rate_id ON projects(commission_rate_id);

-- 3. Back-fill numeric values from the preserved free text. Currency symbols and
--    separators are stripped; anything that doesn't parse cleanly stays NULL and is
--    kept in *_legacy for manual review. Only fills empty rows (safe to re-run).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'projects' AND column_name = 'revenue_legacy') THEN
    UPDATE projects
       SET revenue = regexp_replace(revenue_legacy, '[^0-9.-]', '', 'g')::NUMERIC
     WHERE revenue IS NULL
       AND revenue_legacy IS NOT NULL
       AND regexp_replace(revenue_legacy, '[^0-9.-]', '', 'g') ~ '^-?[0-9]+(\.[0-9]+)?$';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'projects' AND column_name = 'commission_legacy') THEN
    UPDATE projects
       SET commission_amount = regexp_replace(commission_legacy, '[^0-9.-]', '', 'g')::NUMERIC
     WHERE commission_amount IS NULL
       AND commission_legacy IS NOT NULL
       AND regexp_replace(commission_legacy, '[^0-9.-]', '', 'g') ~ '^-?[0-9]+(\.[0-9]+)?$';
  END IF;
END $$;

-- 4. Derive the implied rate where both figures migrated, so old numbers stay
--    consistent with the new computed model.
UPDATE projects
   SET effective_rate         = ROUND(commission_amount / revenue * 100, 2),
       custom_commission_rate = ROUND(commission_amount / revenue * 100, 2)
 WHERE revenue IS NOT NULL AND revenue > 0
   AND commission_amount IS NOT NULL
   AND effective_rate IS NULL
   AND ROUND(commission_amount / revenue * 100, 2) BETWEEN 0 AND 100;

-- NOTE: revenue_legacy / commission_legacy are intentionally KEPT. After you have
-- verified the migrated numbers, you may drop them by hand:
--   ALTER TABLE projects DROP COLUMN IF EXISTS revenue_legacy;
--   ALTER TABLE projects DROP COLUMN IF EXISTS commission_legacy;

-- ---------------------------------------------------------------------------
-- PART B (§8): immutable payment audit trail, written when a share is paid.
-- ---------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_commission_payments_share_id   ON commission_payments(commission_share_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_project_id ON commission_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_user_id    ON commission_payments(user_id);

ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Optional sanity check after running — rows that still need manual attention:
--   SELECT id, name, revenue_legacy, commission_legacy, revenue, commission_amount
--   FROM projects
--   WHERE (revenue_legacy IS NOT NULL AND revenue IS NULL)
--      OR (commission_legacy IS NOT NULL AND commission_amount IS NULL);
-- =============================================================================
