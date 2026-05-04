-- Migration to create customer_opportunities table and update users for permissions

-- 1. Create customer_opportunities table
CREATE TABLE IF NOT EXISTS customer_opportunities (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  opportunity_title VARCHAR(255) NOT NULL,
  opportunity_description TEXT,
  estimated_deal_size VARCHAR(100),
  deal_stage VARCHAR(100), -- Prospect, Qualified, Proposal, Negotiation, etc.
  responsible_person VARCHAR(255),
  expected_closing_date DATE,
  status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Won', 'Lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Add can_create_opportunities to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create_opportunities BOOLEAN DEFAULT FALSE;

-- 3. Update existing admin to have creation permissions (optional but helpful)
-- Assuming admin@gmail.com is the main admin
UPDATE users SET can_create_opportunities = TRUE WHERE email = 'admin@gmail.com';

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_status ON customer_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_created_by ON customer_opportunities(created_by);

-- 5. Enable RLS (Optional, depending on project style)
ALTER TABLE customer_opportunities ENABLE ROW LEVEL SECURITY;

-- 6. Policies for customer_opportunities
-- Everyone (authenticated) can view
CREATE POLICY "Anyone can view customer opportunities" ON customer_opportunities
  FOR SELECT USING (true);

-- Only authorized users can insert
CREATE POLICY "Authorized users can create opportunities" ON customer_opportunities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::INTEGER, 0))
      AND (users.can_create_opportunities = TRUE OR users.is_admin = TRUE)
    )
  );

-- Only authorized users can update
CREATE POLICY "Authorized users can update opportunities" ON customer_opportunities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::INTEGER, 0))
      AND (users.can_create_opportunities = TRUE OR users.is_admin = TRUE)
    )
  );

-- Only admins can delete
CREATE POLICY "Only admins can delete opportunities" ON customer_opportunities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::INTEGER, 0))
      AND users.is_admin = TRUE
    )
  );
