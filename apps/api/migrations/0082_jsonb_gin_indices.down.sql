-- 0082_jsonb_gin_indices.down.sql
-- Reverte a migration 0082 (drop dos índices GIN em colunas JSONB).

DROP INDEX IF EXISTS idx_payments_metadata_gin;
DROP INDEX IF EXISTS idx_wa_messages_metadata_gin;
DROP INDEX IF EXISTS idx_wa_conversations_metadata_gin;
