-- Draft -> Pending Review -> Revision Requested -> Published -> Archived workflow for benefits.
-- is_active stays the actual visibility flag used by RLS and /api/benefits; the application
-- keeps it in sync with status (published => true, everything else => false).

ALTER TABLE benefits
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'revision_requested', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Backfill existing rows so previously-live benefits stay published and stay visible.
UPDATE benefits SET status = 'published' WHERE is_active = true;
UPDATE benefits SET status = 'draft' WHERE is_active = false;

CREATE INDEX IF NOT EXISTS idx_benefits_status ON benefits(status);
