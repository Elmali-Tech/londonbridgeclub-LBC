-- Remove all RLS policies from posts table and disable RLS

-- Drop all policies (if any)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'posts' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON posts;';
  END LOOP;
END $$;

-- Disable RLS on posts table
ALTER TABLE posts DISABLE ROW LEVEL SECURITY; 