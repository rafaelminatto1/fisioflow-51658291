-- 0082_jsonb_gin_indices.sql
--
-- Adiciona índices GIN nas colunas JSONB que JÁ são alvo de queries de
-- filtro/containment no worker. Usa `jsonb_path_ops` (variante menor e mais
-- rápida que `jsonb_ops`) porque o uso atual só requer o operador `@>`
-- (containment) — não precisamos de `?` (key-exists).
--
-- Referências:
--   - PostgreSQL 17 docs §8.14.4 (jsonb Indexing)
--   - Neon docs: https://neon.com/docs/data-types/json
--
-- Trade-offs:
--   - jsonb_path_ops: índice ~30% menor, queries de containment 2-5x mais
--     rápidas; NÃO acelera `data ? 'key'` nem `data->>'k' = 'v'` (estes
--     últimos podem usar índice de expressão btree separado).
--   - Se no futuro precisarmos de key-exists, podemos REINDEX como jsonb_ops.
--
-- Tabelas atingidas (filtradas em queries reais hoje):
--   - payments.metadata        — financial-analytics agrupa por procedure_name / insurance_id
--   - wa_messages.metadata     — whatsapp filtra por appointment_id
--   - wa_conversations.metadata — whatsapp inbox filtra por deleted_at soft-delete
--
-- Tabelas NÃO atingidas (sem queries de filtro hoje):
--   - sessions.{procedures,exercises,measurements,home_exercises}
--     → JSONB serializado/desserializado completo; GIN aqui só adiciona custo
--       de escrita. Adicionar se aparecer query do tipo:
--       `WHERE procedures @> '[{"name": "X"}]'`.
--
-- Aplicar idempotentemente (CREATE INDEX IF NOT EXISTS) para permitir replay.

-- payments.metadata
CREATE INDEX IF NOT EXISTS idx_payments_metadata_gin
  ON payments USING GIN (metadata jsonb_path_ops);

-- whatsapp_messages.metadata
-- O nome da tabela física é `wa_messages` (per src/server/db/schema/whatsapp-inbox.ts).
CREATE INDEX IF NOT EXISTS idx_wa_messages_metadata_gin
  ON wa_messages USING GIN (metadata jsonb_path_ops);

-- whatsapp_conversations.metadata
CREATE INDEX IF NOT EXISTS idx_wa_conversations_metadata_gin
  ON wa_conversations USING GIN (metadata jsonb_path_ops);

-- ============================================================================
-- ROLLBACK (manual)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_payments_metadata_gin;
-- DROP INDEX IF EXISTS idx_wa_messages_metadata_gin;
-- DROP INDEX IF EXISTS idx_wa_conversations_metadata_gin;
