-- Per-project KPI tracking table
CREATE TABLE IF NOT EXISTS project_kpis (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  target      TEXT,
  actual      TEXT,
  unit        TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_kpis_project_id ON project_kpis(project_id);
