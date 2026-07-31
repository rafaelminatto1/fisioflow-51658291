-- Rollback de 0156.
DROP INDEX IF EXISTS idx_sessions_observacao_tsv;
ALTER TABLE sessions DROP COLUMN IF EXISTS observacao_tsv;
