-- 0119_automations.sql
-- Definições de automação (DAG JSON) por organização, com RLS.

CREATE TABLE IF NOT EXISTS automations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  trigger_event TEXT,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  definition    JSONB NOT NULL,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_org ON automations(org_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(org_id, trigger_event) WHERE enabled = true;

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY automations_org_isolation ON automations
  USING (org_id::text = current_setting('app.org_id', true));
