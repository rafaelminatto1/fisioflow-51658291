-- Migration: 0061_ai_usage
-- Tabela de rastreamento de uso e custo de chamadas de IA
-- Usada pelo callAI() para persistência e pelo IAStudio para exibir custo semanal

CREATE TABLE IF NOT EXISTS ai_usage (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT,
  model_id     TEXT NOT NULL,
  provider     TEXT NOT NULL,
  task         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms   INTEGER NOT NULL DEFAULT 0,
  was_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org_created
  ON ai_usage (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created
  ON ai_usage (created_at DESC);
