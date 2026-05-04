-- Connections table for following/follower relationships
CREATE TABLE IF NOT EXISTS public.connections (
  id BIGSERIAL PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Uniqueness constraint: Each follower can only follow someone once
  UNIQUE(follower_id, following_id)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_connections_follower_id ON public.connections(follower_id);
CREATE INDEX IF NOT EXISTS idx_connections_following_id ON public.connections(following_id);

-- Enable Row Level Security
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Users can create their own connections (follow someone)
CREATE POLICY "Users can create their own connections"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid()::text = follower_id);

-- Users can delete their own connections (unfollow someone)
CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE
  USING (auth.uid()::text = follower_id);

-- Anyone can view connections (needed for profile pages and recommendations)
CREATE POLICY "Anyone can view connections"
  ON public.connections FOR SELECT
  USING (true);

-- Supabase function to create the connections table
CREATE OR REPLACE FUNCTION create_connections_table()
RETURNS void AS $$
BEGIN
  -- Table creation is handled by the statements above
  -- This function is just a wrapper to be called via RPC
END;
$$ LANGUAGE plpgsql; 