CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id UUID NOT NULL,
  task_id UUID,
  patient_id UUID,
  project_id UUID,
  appointment_id UUID,
  description TEXT NOT NULL DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate NUMERIC(10,2),
  total_value NUMERIC(10,2),
  tags TEXT[] NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_org_user
  ON time_entries (organization_id, user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_patient
  ON time_entries (patient_id, start_time DESC);

CREATE TABLE IF NOT EXISTS timer_drafts (
  user_id TEXT PRIMARY KEY,
  timer JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
