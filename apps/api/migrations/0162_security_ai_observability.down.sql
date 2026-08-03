DELETE FROM schema_migration_ledger
 WHERE migration_key = '0162_security_ai_observability';

DROP INDEX IF EXISTS idx_ai_usage_events_task_status;
DROP INDEX IF EXISTS idx_ai_usage_events_org_created;
DROP TABLE IF EXISTS ai_usage_events;

DROP INDEX IF EXISTS idx_ai_usage_org_created;
DROP POLICY IF EXISTS ai_usage_org_select ON ai_usage;
DROP POLICY IF EXISTS ai_usage_org_insert ON ai_usage;
ALTER TABLE ai_usage NO FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_usage DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation_medical_records ON medical_records;
ALTER TABLE medical_records NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation_clinical_scribe_logs ON clinical_scribe_logs;
ALTER TABLE clinical_scribe_logs NO FORCE ROW LEVEL SECURITY;

-- O ledger é compartilhado por migrations posteriores; sua remoção é uma
-- operação administrativa separada e não faz parte deste rollback.
