-- 0141_kb_index_chunks.sql
-- Contagem de chunks indexados por documento, para limpeza determinística
-- (apaga o delta por chave exata quando um doc encolhe, sem items.list).
CREATE TABLE IF NOT EXISTS kb_index_chunks (
  doc_key     TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
