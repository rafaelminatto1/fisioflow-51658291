-- 0115_evidence_gateway.sql
-- Cache global de artigos + vínculos por organização (RLS).
-- vector extension already enabled in 0110_agent_memories.sql

CREATE TABLE IF NOT EXISTS evidence_articles (
  pmid        TEXT PRIMARY KEY,
  doi         TEXT,
  source      TEXT NOT NULL DEFAULT 'pubmed',
  title       TEXT NOT NULL,
  abstract    TEXT,
  authors     JSONB NOT NULL DEFAULT '[]'::jsonb,
  journal     TEXT,
  pub_date    TEXT,
  mesh        JSONB NOT NULL DEFAULT '[]'::jsonb,
  pmc_id      TEXT,
  oa_status   TEXT NOT NULL DEFAULT 'unknown',
  study_type  TEXT,
  raw         JSONB,
  embedding   vector(1024),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL,
  article_pmid   TEXT NOT NULL REFERENCES evidence_articles(pmid) ON DELETE CASCADE,
  target_type    TEXT NOT NULL CHECK (target_type IN ('exercise','protocol','wiki','patient','assessment')),
  target_id      TEXT NOT NULL,
  evidence_level TEXT,
  note           TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_links_org ON evidence_links(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_target ON evidence_links(org_id, target_type, target_id);

ALTER TABLE evidence_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_links_org_isolation ON evidence_links
  USING (org_id::text = current_setting('app.org_id', true));
