-- Migration 0110: memória persistente de agentes (fallback pgvector do Agent Memory).
-- Quando o Cloudflare Agent Memory (private beta) for liberado, o driver nativo
-- assume e esta tabela vira candidata a migração one-shot (task T064).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID,
  therapist_id TEXT,
  session_id TEXT,
  profile_types TEXT[] NOT NULL DEFAULT '{organization}',
  content TEXT NOT NULL,
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_memories_org_idx ON agent_memories (organization_id);
CREATE INDEX IF NOT EXISTS agent_memories_patient_idx ON agent_memories (patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_memories_vector_idx
  ON agent_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories FORCE ROW LEVEL SECURITY;

CREATE POLICY policy_agent_memories_isolation ON agent_memories
  FOR ALL
  TO authenticated
  USING (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid))
  WITH CHECK (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid));
