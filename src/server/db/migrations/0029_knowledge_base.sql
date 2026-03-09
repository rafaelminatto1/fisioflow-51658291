CREATE TABLE IF NOT EXISTS knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  title text NOT NULL,
  "group" text NOT NULL,
  subgroup text NOT NULL DEFAULT '',
  focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence text NOT NULL DEFAULT 'B',
  year integer,
  source text,
  url text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, article_id)
);

CREATE TABLE IF NOT EXISTS knowledge_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('organization', 'user')),
  scope_key text NOT NULL,
  user_id uuid,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text,
  evidence text,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, article_id, scope, scope_key)
);

CREATE TABLE IF NOT EXISTS knowledge_curation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  assigned_to uuid,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, article_id)
);

CREATE TABLE IF NOT EXISTS knowledge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_org_updated
  ON knowledge_articles (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_annotations_org_scope_user
  ON knowledge_annotations (organization_id, scope, user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_curation_org_updated
  ON knowledge_curation (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_audit_org_created
  ON knowledge_audit (organization_id, created_at DESC);
