-- Benefits table for member benefits and discounts
CREATE TABLE IF NOT EXISTS benefits (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_key VARCHAR(255), -- AWS S3 key for benefit image
  category VARCHAR(20) NOT NULL CHECK (category IN ('discount', 'service', 'event', 'exclusive')),
  partner_name VARCHAR(255),
  partner_website VARCHAR(255),
  discount_percentage INTEGER, -- For discount benefits
  discount_code VARCHAR(50), -- Promo code for the benefit
  valid_until DATE, -- Expiry date for the benefit
  terms_conditions TEXT, -- Terms and conditions
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_benefits_category ON benefits(category);
CREATE INDEX IF NOT EXISTS idx_benefits_is_active ON benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_benefits_valid_until ON benefits(valid_until);
CREATE INDEX IF NOT EXISTS idx_benefits_created_at ON benefits(created_at);

-- Enable Row Level Security
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;

-- Anyone can view active benefits (simplified policy)
CREATE POLICY "Anyone can view active benefits"
  ON benefits FOR SELECT
  USING (is_active = true);

-- For admin operations, we'll handle authorization in the application layer
-- This policy allows authenticated users to manage benefits (we'll check admin status in API)
CREATE POLICY "Authenticated users can manage benefits"
  ON benefits FOR ALL
  USING (auth.role() = 'authenticated');

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_benefits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on benefits table
CREATE TRIGGER update_benefits_updated_at_trigger
  BEFORE UPDATE ON benefits
  FOR EACH ROW
  EXECUTE FUNCTION update_benefits_updated_at(); 