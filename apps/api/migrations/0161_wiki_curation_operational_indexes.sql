-- Índices incrementais para as consultas operacionais de curadoria.
-- Esta migration não altera grants nem reescreve o histórico editorial.

CREATE INDEX IF NOT EXISTS idx_knowledge_reviews_version_latest
  ON knowledge_reviews (organization_id, version_id, created_at DESC)
  INCLUDE (valid_until, action);

CREATE INDEX IF NOT EXISTS idx_knowledge_idempotency_cleanup
  ON knowledge_idempotency_keys (expires_at);
