-- Proposals get the same Draft -> Pending Review -> Approved/Revision Requested -> Published
-- -> Archived review workflow already used by benefits/partners (reusing the shared
-- WorkflowStatus values), gating whether a proposal can be sent to a customer. Existing
-- proposals are backfilled to 'published' so real, already-in-flight proposals aren't
-- retroactively hidden behind a review gate that didn't exist when they were made.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'pending_review', 'revision_requested', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revision_notes TEXT;

UPDATE proposals SET review_status = 'published' WHERE review_status = 'draft';
