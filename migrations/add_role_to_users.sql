-- Migration: Add role column to users table
-- Roles: admin, opportunity_manager, sales_member, viewer

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'viewer';
    END IF;
END $$;

-- Migration: Initialize roles based on existing is_admin flag
UPDATE users SET role = 'admin' WHERE is_admin = true;
UPDATE users SET role = 'viewer' WHERE is_admin = false OR is_admin IS NULL;

-- Optional: You can refine this later if you have specific users for other roles
-- UPDATE users SET role = 'opportunity_manager' WHERE email = 'specific_email@example.com';
