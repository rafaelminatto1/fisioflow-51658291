-- Endurece isolamento multi-tenant e cria a trilha de uso de IA.
-- Idempotente: pode ser reaplicada com segurança em ambientes parcialmente migrados.

ALTER TABLE clinical_scribe_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_scribe_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_clinical_scribe_logs ON clinical_scribe_logs;
CREATE POLICY org_isolation_clinical_scribe_logs ON clinical_scribe_logs
  FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_medical_records ON medical_records;
CREATE POLICY org_isolation_medical_records ON medical_records
  FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_usage_org_select ON ai_usage;
DROP POLICY IF EXISTS ai_usage_org_insert ON ai_usage;
CREATE POLICY ai_usage_org_select ON ai_usage
  FOR SELECT
  USING (organization_id IS NOT NULL
    AND organization_id::text = current_setting('app.org_id', true));
CREATE POLICY ai_usage_org_insert ON ai_usage
  FOR INSERT
  WITH CHECK (organization_id IS NULL
    OR organization_id::text = current_setting('app.org_id', true));
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_created
  ON ai_usage (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  user_id uuid,
  patient_id uuid REFERENCES patients(id),
  task_type varchar(50) NOT NULL,
  model varchar(100) NOT NULL,
  provider varchar(50) NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd double precision NOT NULL DEFAULT 0,
  estimated_cost_brl double precision NOT NULL DEFAULT 0,
  latency_ms integer,
  status varchar(32) NOT NULL DEFAULT 'completed',
  gateway_used boolean NOT NULL DEFAULT false,
  cache_hit boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_events_status_check CHECK (
    status IN ('completed', 'failed', 'blocked_by_budget', 'fallback')
  )
);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_usage_events_org_select ON ai_usage_events;
DROP POLICY IF EXISTS ai_usage_events_org_insert ON ai_usage_events;
CREATE POLICY ai_usage_events_org_select ON ai_usage_events
  FOR SELECT
  USING (organization_id IS NOT NULL
    AND organization_id::text = current_setting('app.org_id', true));
CREATE POLICY ai_usage_events_org_insert ON ai_usage_events
  FOR INSERT
  WITH CHECK (organization_id IS NULL
    OR organization_id::text = current_setting('app.org_id', true));
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_org_created
  ON ai_usage_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_task_status
  ON ai_usage_events (task_type, status, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migration_ledger (
  migration_key text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text NOT NULL DEFAULT current_user,
  notes text
);

INSERT INTO schema_migration_ledger (migration_key, checksum, notes)
VALUES (
  '0162_security_ai_observability',
  'repository-0162-security-ai-observability',
  'RLS clinical_scribe_logs, medical_records, ai_usage e ai_usage_events'
)
ON CONFLICT (migration_key) DO NOTHING;
