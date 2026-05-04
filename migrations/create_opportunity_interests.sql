-- Migration to create opportunity_interests table

-- 1. Create opportunity_interests table
DROP TABLE IF EXISTS opportunity_interests;

CREATE TABLE IF NOT EXISTS opportunity_interests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, opportunity_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_user_id ON opportunity_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_opportunity_id ON opportunity_interests(opportunity_id);

-- 3. Enable RLS
ALTER TABLE opportunity_interests ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Users can insert their own interests
CREATE POLICY "Users can insert their own interests" ON opportunity_interests
  FOR INSERT WITH CHECK (
    user_id = (SELECT COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::INTEGER, 0))
  );

-- Users can view their own interests, Admins can view all
CREATE POLICY "Users can view their own interests" ON opportunity_interests
  FOR SELECT USING (
    user_id = (SELECT COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::INTEGER, 0))
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::INTEGER, 0))
      AND users.is_admin = TRUE
    )
  );

-- Users can delete their own interests (optional, but good for "un-interest")
CREATE POLICY "Users can delete their own interests" ON opportunity_interests
  FOR DELETE USING (
    user_id = (SELECT COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::INTEGER, 0))
  );
