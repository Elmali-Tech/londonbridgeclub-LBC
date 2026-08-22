-- A separate multi-entry log per meeting, distinct from the single `meetings.notes` field
-- (same shape as customer_notes).

CREATE TABLE IF NOT EXISTS meeting_notes (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  logged_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_id ON meeting_notes(meeting_id);
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
