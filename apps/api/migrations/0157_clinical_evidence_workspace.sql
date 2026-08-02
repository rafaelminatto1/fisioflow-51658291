-- Workspace clínico de evidências. Migração aditiva e compatível com 0115.

CREATE TABLE IF NOT EXISTS evidence_resources (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmid TEXT,
  doi TEXT,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidence_resources_identifier_required
    CHECK (pmid IS NOT NULL OR doi IS NOT NULL OR sha256 IS NOT NULL),
  CONSTRAINT evidence_resources_pmid_format CHECK (pmid IS NULL OR pmid ~ '^[0-9]+$'),
  CONSTRAINT evidence_resources_doi_normalized CHECK (
    doi IS NULL OR (doi = lower(btrim(doi)) AND doi ~ '^10\.[0-9]{4,9}/\S+$')
  ),
  CONSTRAINT evidence_resources_sha256_format CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_resources_pmid
  ON evidence_resources (pmid) WHERE pmid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_resources_doi
  ON evidence_resources (doi) WHERE doi IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_resources_sha256
  ON evidence_resources (sha256) WHERE sha256 IS NOT NULL;

WITH normalized_articles AS (
  SELECT ea.pmid,
         NULLIF(lower(btrim(regexp_replace(ea.doi, '^(https?://(dx\.)?doi\.org/|doi:\s*)', '', 'i'))), '') AS doi
  FROM evidence_articles ea
  WHERE ea.pmid ~ '^[0-9]+$'
), safe_articles AS (
  SELECT pmid,
         CASE WHEN doi ~ '^10\.[0-9]{4,9}/\S+$' AND count(*) OVER (PARTITION BY doi) = 1 THEN doi END AS doi
  FROM normalized_articles
)
INSERT INTO evidence_resources (pmid, doi)
SELECT pmid, doi FROM safe_articles
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS organization_evidence (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES evidence_resources(article_id) ON DELETE RESTRICT,
  imported_by TEXT NOT NULL,
  import_status TEXT NOT NULL DEFAULT 'imported'
    CHECK (import_status IN ('pending','fetching','imported','failed','cancelled','identifier_conflict')),
  index_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (index_status IN ('not_started','queued','processing','indexed','failed')),
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','in_review','verified','rejected','archived')),
  license_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (license_status IN ('open_access','abstract_only','restricted','unknown')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_evidence_workspace
  ON organization_evidence (organization_id, updated_at DESC, article_id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_evidence_org_article
  ON organization_evidence (organization_id, article_id);

CREATE TABLE IF NOT EXISTS evidence_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal','organization')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_collections_workspace
  ON evidence_collections (organization_id, updated_at DESC, id DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS evidence_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL,
  article_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_evidence_collection_items_collection
    FOREIGN KEY (organization_id, collection_id)
    REFERENCES evidence_collections(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_evidence_collection_items_article
    FOREIGN KEY (organization_id, article_id)
    REFERENCES organization_evidence(organization_id, article_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_collection_items_active
  ON evidence_collection_items (organization_id, collection_id, article_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_collection_items_order
  ON evidence_collection_items (organization_id, collection_id, position, created_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS evidence_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id UUID NOT NULL,
  reviewer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','in_review','verified','rejected','archived')),
  valid_until DATE,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 4000),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_evidence_reviews_article FOREIGN KEY (organization_id, article_id)
    REFERENCES organization_evidence(organization_id, article_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidence_reviews_workspace
  ON evidence_reviews (organization_id, article_id, updated_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS evidence_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  snapshot_version INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  prompt_version TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_comparisons_workspace
  ON evidence_comparisons (organization_id, updated_at DESC, id DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS evidence_comparison_items (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comparison_id UUID NOT NULL,
  article_id UUID NOT NULL,
  position SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, comparison_id, article_id),
  UNIQUE (organization_id, comparison_id, position),
  FOREIGN KEY (organization_id, comparison_id)
    REFERENCES evidence_comparisons(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, article_id)
    REFERENCES organization_evidence(organization_id, article_id) ON DELETE RESTRICT
);

DO $rls$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organization_evidence', 'evidence_collections', 'evidence_collection_items',
    'evidence_reviews', 'evidence_comparisons', 'evidence_comparison_items'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_org_isolation', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (organization_id::text = current_setting(''app.org_id'', true)) WITH CHECK (organization_id::text = current_setting(''app.org_id'', true))',
      table_name || '_org_isolation', table_name
    );
  END LOOP;
END $rls$;
