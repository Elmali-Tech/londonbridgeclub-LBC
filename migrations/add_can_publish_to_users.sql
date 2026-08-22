-- Layers a can_publish capability onto the existing role system (admin/opportunity_manager/
-- sales_member/viewer), rather than replacing it. Admins get the capability automatically;
-- it can be granted to other roles individually via the admin Users page.

ALTER TABLE users ADD COLUMN IF NOT EXISTS can_publish BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET can_publish = true WHERE role = 'admin' OR is_admin = true;
