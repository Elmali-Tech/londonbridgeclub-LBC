-- Create user_tags table for storing user profile tags (job_title, goals, interests)
CREATE TABLE IF NOT EXISTS public.user_tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tag_type VARCHAR(20) NOT NULL CHECK (tag_type IN ('job_title', 'goals', 'interests')),
    tag_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of user_id, tag_type, and tag_value
    UNIQUE(user_id, tag_type, tag_value)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON public.user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_type ON public.user_tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_type ON public.user_tags(user_id, tag_type);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view all tags (for social features)
CREATE POLICY "Users can view all user tags" ON public.user_tags
    FOR SELECT USING (true);

-- Users can only insert/update/delete their own tags
CREATE POLICY "Users can manage their own tags" ON public.user_tags
    FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_user_tags_updated_at
    BEFORE UPDATE ON public.user_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tags_updated_at();

-- Add comment to table
COMMENT ON TABLE public.user_tags IS 'Stores user profile tags including job titles, goals, and interests';
COMMENT ON COLUMN public.user_tags.tag_type IS 'Type of tag: job_title, goals, or interests';
COMMENT ON COLUMN public.user_tags.tag_value IS 'The actual tag value/text';
