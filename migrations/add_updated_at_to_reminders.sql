-- reminders was missing this from the standard audit-field set.

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
