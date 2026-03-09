ALTER TABLE knowledge_articles
  ADD COLUMN IF NOT EXISTS article_type text NOT NULL DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS clinical_implications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vector_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS citation_count integer,
  ADD COLUMN IF NOT EXISTS raw_text text;

CREATE TABLE IF NOT EXISTS knowledge_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  page_ref integer,
  highlight_color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_notes_article_user_created
  ON knowledge_notes (organization_id, article_id, user_id, created_at DESC);
