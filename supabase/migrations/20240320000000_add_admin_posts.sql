-- Add is_admin_post and is_pinned columns to posts table
ALTER TABLE posts
ADD COLUMN is_admin_post BOOLEAN DEFAULT FALSE,
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on admin posts
CREATE INDEX idx_posts_admin_pinned ON posts (is_admin_post, is_pinned);

-- Add comment to explain the new columns
COMMENT ON COLUMN posts.is_admin_post IS 'Indicates if the post was created by an admin';
COMMENT ON COLUMN posts.is_pinned IS 'Indicates if the post should be pinned to the top of the feed'; 