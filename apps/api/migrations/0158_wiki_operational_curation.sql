-- Canonical, organization-scoped editorial model for Wiki curation.
-- Additive: legacy tables remain authoritative until their adapters are enabled.

CREATE TABLE knowledge_capability_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  capability TEXT NOT NULL CHECK (capability IN (
    'manage_library','clinical_review','publish_knowledge','manage_library_policy'
  )),
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_by TEXT,
  revoked_at TIMESTAMPTZ,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 500),
  UNIQUE (organization_id, user_id, capability)
);

CREATE INDEX idx_knowledge_capability_grants_active
  ON knowledge_capability_grants (organization_id, user_id, capability)
  WHERE revoked_at IS NULL;

CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'guidance','protocol','trail','test','exercise','source','term','page'
  )),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  slug TEXT,
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version > 0),
  approved_version_id UUID,
  published_version_id UUID,
  created_by TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX uq_knowledge_items_slug_active
  ON knowledge_items (organization_id, slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_knowledge_items_queue
  ON knowledge_items (organization_id, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE knowledge_item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  editorial_status TEXT NOT NULL DEFAULT 'draft' CHECK (editorial_status IN (
    'draft','triage','clinical_review','changes_requested','rejected','approved',
    'published','review_due','superseded','archived'
  )),
  technical_status TEXT NOT NULL DEFAULT 'not_started' CHECK (technical_status IN (
    'not_started','queued','processing','indexed','failed'
  )),
  authored_by TEXT NOT NULL,
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, item_id, version_number),
  FOREIGN KEY (organization_id, item_id)
    REFERENCES knowledge_items(organization_id, id) ON DELETE CASCADE
);

ALTER TABLE knowledge_items
  ADD CONSTRAINT fk_knowledge_items_approved_version
    FOREIGN KEY (organization_id, approved_version_id)
    REFERENCES knowledge_item_versions(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_knowledge_items_published_version
    FOREIGN KEY (organization_id, published_version_id)
    REFERENCES knowledge_item_versions(organization_id, id) ON DELETE RESTRICT;

CREATE INDEX idx_knowledge_versions_queue
  ON knowledge_item_versions (organization_id, editorial_status, created_at DESC, id DESC);

CREATE TABLE knowledge_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  version_id UUID NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reviewer_id TEXT,
  approved_by TEXT,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 4000),
  valid_until DATE,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, item_id)
    REFERENCES knowledge_items(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, version_id)
    REFERENCES knowledge_item_versions(organization_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_reviews_item
  ON knowledge_reviews (organization_id, item_id, created_at DESC);

CREATE TABLE knowledge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  version_id UUID NOT NULL,
  assignment_type TEXT NOT NULL DEFAULT 'owner' CHECK (assignment_type IN ('owner','reviewer')),
  assignee_id TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  due_at TIMESTAMPTZ,
  assigned_by TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, item_id)
    REFERENCES knowledge_items(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, version_id)
    REFERENCES knowledge_item_versions(organization_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_knowledge_assignments_active
  ON knowledge_assignments (organization_id, version_id, assignment_type)
  WHERE completed_at IS NULL;
CREATE INDEX idx_knowledge_assignments_queue
  ON knowledge_assignments (organization_id, assignee_id, due_at)
  WHERE completed_at IS NULL;

CREATE TABLE knowledge_source_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'wiki_pages','knowledge_articles','evidence_resources','organization_evidence'
  )),
  source_id TEXT NOT NULL,
  knowledge_item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_type, source_id),
  FOREIGN KEY (organization_id, knowledge_item_id)
    REFERENCES knowledge_items(organization_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_source_map_item
  ON knowledge_source_map (organization_id, knowledge_item_id);

CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  version_id UUID,
  source_type TEXT NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  url TEXT,
  doi TEXT,
  pmid TEXT,
  license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, item_id)
    REFERENCES knowledge_items(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, version_id)
    REFERENCES knowledge_item_versions(organization_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_sources_item
  ON knowledge_sources (organization_id, item_id, version_id);

CREATE TABLE knowledge_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_audit_events_entity
  ON knowledge_audit_events (organization_id, entity_type, entity_id, created_at DESC);

CREATE TABLE knowledge_idempotency_keys (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (organization_id, actor_id, operation, idempotency_key)
);

CREATE INDEX idx_knowledge_idempotency_expiry
  ON knowledge_idempotency_keys (organization_id, expires_at);

-- Conservative, restartable backfill. Legacy publication/verification never becomes
-- canonical approval without an auditable review.
DO $backfill$
DECLARE source RECORD; item_uuid UUID; version_uuid UUID;
BEGIN
  FOR source IN
    SELECT id, organization_id, title, slug, content, html_content, is_published,
           COALESCE(created_by, 'legacy-backfill') AS actor
      FROM wiki_pages WHERE organization_id IS NOT NULL AND deleted_at IS NULL
  LOOP
    SELECT knowledge_item_id INTO item_uuid FROM knowledge_source_map
      WHERE organization_id = source.organization_id AND source_type = 'wiki_pages'
        AND source_id = source.id::text;
    IF item_uuid IS NULL THEN
      INSERT INTO knowledge_items (organization_id, kind, title, slug, created_by)
      VALUES (source.organization_id, 'page', source.title, source.slug, source.actor)
      RETURNING id INTO item_uuid;
      INSERT INTO knowledge_source_map (organization_id, source_type, source_id, knowledge_item_id)
      VALUES (source.organization_id, 'wiki_pages', source.id::text, item_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM knowledge_item_versions WHERE organization_id = source.organization_id AND item_id = item_uuid) THEN
      INSERT INTO knowledge_item_versions
        (organization_id,item_id,version_number,title,content,metadata,editorial_status,authored_by)
      VALUES (source.organization_id,item_uuid,1,source.title,COALESCE(source.content,''),
        jsonb_build_object('legacyWikiPageId',source.id,'htmlContent',source.html_content),
        CASE WHEN source.is_published THEN 'triage' ELSE 'draft' END,source.actor)
      RETURNING id INTO version_uuid;
    END IF;
  END LOOP;

  IF to_regclass('public.knowledge_articles') IS NOT NULL THEN
    FOR source IN EXECUTE
      'SELECT organization_id, article_id, title, COALESCE(created_by, ''legacy-backfill'') actor,
              COALESCE(raw_text, summary, '''') content, url, source, evidence
         FROM knowledge_articles'
    LOOP
      SELECT knowledge_item_id INTO item_uuid FROM knowledge_source_map
        WHERE organization_id = source.organization_id AND source_type = 'knowledge_articles'
          AND source_id = source.article_id::text;
      IF item_uuid IS NULL THEN
        INSERT INTO knowledge_items (organization_id,kind,title,created_by)
        VALUES (source.organization_id,'source',COALESCE(NULLIF(source.title,''),'Fonte sem título'),source.actor)
        RETURNING id INTO item_uuid;
        INSERT INTO knowledge_source_map (organization_id,source_type,source_id,knowledge_item_id)
        VALUES (source.organization_id,'knowledge_articles',source.article_id::text,item_uuid);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM knowledge_item_versions WHERE organization_id = source.organization_id AND item_id = item_uuid) THEN
        INSERT INTO knowledge_item_versions
          (organization_id,item_id,version_number,title,content,metadata,editorial_status,authored_by)
        VALUES (source.organization_id,item_uuid,1,COALESCE(NULLIF(source.title,''),'Fonte sem título'),
          COALESCE(source.content,''),jsonb_build_object('legacyEvidence',source.evidence),'triage',source.actor)
        RETURNING id INTO version_uuid;
        INSERT INTO knowledge_sources (organization_id,item_id,version_id,source_type,source_id,title,url)
        VALUES (source.organization_id,item_uuid,version_uuid,'knowledge_articles',source.article_id::text,
          COALESCE(NULLIF(source.title,''),'Fonte sem título'),source.url);
      END IF;
    END LOOP;
  END IF;

  IF to_regclass('public.organization_evidence') IS NOT NULL THEN
    FOR source IN
      SELECT oe.organization_id, oe.article_id, oe.imported_by actor, er.doi, er.pmid,
             COALESCE(ea.title, er.doi, er.pmid, 'Fonte científica sem título') title
        FROM organization_evidence oe JOIN evidence_resources er ON er.article_id = oe.article_id
        LEFT JOIN evidence_articles ea ON ea.pmid = er.pmid
    LOOP
      SELECT knowledge_item_id INTO item_uuid FROM knowledge_source_map
        WHERE organization_id = source.organization_id AND source_type = 'organization_evidence'
          AND source_id = source.article_id::text;
      IF item_uuid IS NULL THEN
        INSERT INTO knowledge_items (organization_id,kind,title,created_by)
        VALUES (source.organization_id,'source',source.title,source.actor) RETURNING id INTO item_uuid;
        INSERT INTO knowledge_source_map (organization_id,source_type,source_id,knowledge_item_id)
        VALUES (source.organization_id,'organization_evidence',source.article_id::text,item_uuid);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM knowledge_item_versions WHERE organization_id = source.organization_id AND item_id = item_uuid) THEN
        INSERT INTO knowledge_item_versions
          (organization_id,item_id,version_number,title,editorial_status,authored_by)
        VALUES (source.organization_id,item_uuid,1,source.title,'triage',source.actor)
        RETURNING id INTO version_uuid;
        INSERT INTO knowledge_sources
          (organization_id,item_id,version_id,source_type,source_id,title,doi,pmid)
        VALUES (source.organization_id,item_uuid,version_uuid,'evidence_resources',source.article_id::text,
          source.title,source.doi,source.pmid);
      END IF;
    END LOOP;
  END IF;
END $backfill$;

-- Bootstrap administrativo idempotente. O owner ativo mais antigo de cada
-- organização recebe somente capacidades administrativas; revisão clínica nunca é
-- concedida por papel ou migration.
WITH first_owner AS (
  SELECT DISTINCT ON (organization_id)
         organization_id, user_id
    FROM profiles
   WHERE organization_id IS NOT NULL
     AND user_id IS NOT NULL
     AND is_active IS NOT FALSE
     AND (role = 'owner' OR 'owner' = ANY(COALESCE(roles, ARRAY[]::text[])))
   ORDER BY organization_id, created_at ASC, id ASC
), bootstrap_capabilities(capability) AS (
  VALUES ('manage_library'), ('publish_knowledge'), ('manage_library_policy')
)
INSERT INTO knowledge_capability_grants
  (organization_id, user_id, capability, granted_by, reason)
SELECT owner.organization_id, owner.user_id, capability.capability,
       owner.user_id, 'bootstrap owner inicial — migration 0158'
  FROM first_owner owner CROSS JOIN bootstrap_capabilities capability
ON CONFLICT (organization_id, user_id, capability) DO NOTHING;

DO $rls$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'knowledge_capability_grants','knowledge_items','knowledge_item_versions',
    'knowledge_reviews','knowledge_assignments','knowledge_source_map',
    'knowledge_sources','knowledge_audit_events','knowledge_idempotency_keys'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY %I ON %I USING (organization_id::text = current_setting(''app.org_id'', true)) WITH CHECK (organization_id::text = current_setting(''app.org_id'', true))', table_name || '_org_isolation', table_name);
  END LOOP;
END $rls$;
