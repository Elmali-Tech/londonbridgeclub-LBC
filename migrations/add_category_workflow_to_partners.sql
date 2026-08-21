-- Category-based structure + Draft/Pending Review/Revision Requested/Published/Archived
-- workflow for partners, matching the pattern already applied to benefits.
--
-- Partners had no visibility flag before this migration (RLS SELECT was fully open,
-- USING (true)); status = 'published' becomes the single source of truth for visibility.

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS category VARCHAR(30)
    CHECK (category IS NULL OR category IN (
      'Loyalty', 'Meal Cards', 'Fuel', 'Travel', 'Insurance', 'Technology',
      'Artificial Intelligence', 'Digital Marketing', 'PR', 'Media',
      'Electricity', 'Logistics', 'Finance', 'Healthcare'
    )),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS responsible_person INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'revision_requested', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Every row that exists at migration time is already a live partner; promote past
-- the new 'draft' default so nothing currently visible disappears.
UPDATE partners SET status = 'published';

-- Tighten the public read policy: previously every partner was publicly readable
-- (USING (true)) regardless of readiness. Now only published ones are.
DROP POLICY IF EXISTS "Herkes partner listesini görebilir" ON partners;
CREATE POLICY "Anyone can view published partners"
  ON partners FOR SELECT
  USING (status = 'published');

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_category ON partners(category);
