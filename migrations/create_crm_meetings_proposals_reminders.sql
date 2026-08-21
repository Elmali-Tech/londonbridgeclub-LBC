-- CRM proper: Meetings, Proposals, Reminders (net new), plus locking down the
-- Sales Pipeline stage column on customer_opportunities.
--
-- Internal CRM data only, never public-facing, so no permissive RLS policy is
-- added — default-deny; all access goes through the service-role admin API,
-- same as customers/customer_contacts/customer_notes.

CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES customer_contacts(id) ON DELETE SET NULL,
  customer_opportunity_id INTEGER REFERENCES customer_opportunities(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  meeting_type VARCHAR(50) DEFAULT 'In-Person' CHECK (meeting_type IN ('In-Person', 'Call', 'Video Call')),
  attendees TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_opportunity_id INTEGER REFERENCES customer_opportunities(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired')),
  sent_date DATE,
  document_key VARCHAR(255),
  responsible_person INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  customer_opportunity_id INTEGER REFERENCES customer_opportunities(id) ON DELETE CASCADE,
  assigned_to INTEGER REFERENCES users(id),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meetings_customer_id ON meetings(customer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_proposals_customer_id ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Lock down the Sales Pipeline stage column. It has been free-text VARCHAR(100)
-- with no constraint; normalize known legacy values, then catch anything else
-- unrecognized (defensive — an unexpected stray value would otherwise make the
-- ADD CONSTRAINT below fail outright) before enforcing the exact 4-stage set
-- already hardcoded across customer-pool/tracking/kpi-dashboard.
UPDATE customer_opportunities SET deal_stage = 'Lead' WHERE deal_stage = 'Prospect';
UPDATE customer_opportunities SET deal_stage = 'Qualified' WHERE deal_stage = 'Opportunity';
UPDATE customer_opportunities
  SET deal_stage = 'Lead'
  WHERE deal_stage IS NULL OR deal_stage NOT IN ('Lead', 'Qualified', 'Proposal', 'Negotiation');

ALTER TABLE customer_opportunities
  ADD CONSTRAINT customer_opportunities_deal_stage_check
  CHECK (deal_stage IN ('Lead', 'Qualified', 'Proposal', 'Negotiation'));
