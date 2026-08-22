-- Lets a task link directly to an opportunity, not just a project/customer.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS customer_opportunity_id INTEGER REFERENCES customer_opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_customer_opportunity_id ON tasks(customer_opportunity_id);
