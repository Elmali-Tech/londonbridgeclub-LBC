-- Add date_of_birth column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add index for birthday queries (month and day only)
CREATE INDEX IF NOT EXISTS idx_users_birthday ON users (
  EXTRACT(MONTH FROM date_of_birth),
  EXTRACT(DAY FROM date_of_birth)
);

-- Add index for recently joined users
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- Generate random birthdays for existing users (for testing purposes)
-- This assigns random dates between 1970 and 2005
UPDATE users 
SET date_of_birth = DATE '1970-01-01' + (RANDOM() * (DATE '2005-12-31' - DATE '1970-01-01'))::INTEGER
WHERE date_of_birth IS NULL;

-- Set 2 users to have birthday today (for testing)
-- This updates the first 2 users to have today's date as their birthday
UPDATE users
SET date_of_birth = DATE_TRUNC('year', CURRENT_DATE - INTERVAL '25 years')::DATE + 
                    MAKE_INTERVAL(days => EXTRACT(DOY FROM CURRENT_DATE)::INTEGER - 1)
WHERE id IN (
  SELECT id FROM users ORDER BY id LIMIT 2
);

