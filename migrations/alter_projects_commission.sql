-- Restructure project commission from free-text into a rate-driven, computed model.
--
-- NON-DESTRUCTIVE (§9 Migration): the old free-text `revenue`/`commission` VARCHAR
-- columns are PRESERVED by renaming them to `*_legacy`, never dropped, so manually
-- entered values are never lost. Parsed numeric values are then back-filled into the
-- new structured columns. The legacy columns can be dropped later, by hand, only once
-- the migrated numbers have been verified.
--
--   revenue                NUMERIC  — project revenue (e.g. 50000.00)
--   commission_rate_id     INTEGER  — the chosen standard rate (NULL when custom)
--   custom_commission_rate NUMERIC  — a per-project override percentage (NULL when standard)
--   effective_rate         NUMERIC  — snapshot of the % actually used, so later edits to
--                                     a rate in the library never rewrite this project
--   commission_amount      NUMERIC  — computed by the API: revenue * effective_rate / 100
--
-- This script is idempotent: safe to run once, or again after a partial run.

-- 1. Preserve existing free-text values by renaming (only if a legacy text column
--    is still present under its original name and hasn't been preserved yet).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'revenue'
      AND data_type IN ('character varying', 'text')
  ) THEN
    ALTER TABLE projects RENAME COLUMN revenue TO revenue_legacy;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'commission'
      AND data_type IN ('character varying', 'text')
  ) THEN
    ALTER TABLE projects RENAME COLUMN commission TO commission_legacy;
  END IF;
END $$;

-- 2. Add the new structured, numeric columns.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revenue                NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS commission_rate_id     INTEGER REFERENCES commission_rates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_commission_rate NUMERIC(5,2) CHECK (custom_commission_rate IS NULL OR (custom_commission_rate >= 0 AND custom_commission_rate <= 100)),
  ADD COLUMN IF NOT EXISTS effective_rate         NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount      NUMERIC(14,2);

CREATE INDEX IF NOT EXISTS idx_projects_commission_rate_id ON projects(commission_rate_id);

-- 3. Back-fill numeric values from the preserved free text. Currency symbols,
--    thousands separators and stray characters are stripped; anything that does not
--    parse cleanly is left NULL (and kept in *_legacy) for manual review rather than
--    guessed at. Only fills rows still empty, so re-running never overwrites edits.
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

-- 4. Where both a revenue and a commission amount were migrated, derive the implied
--    percentage and record it as a per-project custom rate + effective-rate snapshot,
--    so the historical numbers stay consistent with the new computed model.
UPDATE projects
   SET effective_rate         = ROUND(commission_amount / revenue * 100, 2),
       custom_commission_rate = ROUND(commission_amount / revenue * 100, 2)
 WHERE revenue IS NOT NULL AND revenue > 0
   AND commission_amount IS NOT NULL
   AND effective_rate IS NULL
   AND ROUND(commission_amount / revenue * 100, 2) BETWEEN 0 AND 100;
