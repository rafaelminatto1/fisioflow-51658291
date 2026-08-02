
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
  UNIQUE (organization_id, item_id, id),
  UNIQUE (organization_id, item_id, version_number),
  FOREIGN KEY (organization_id, item_id)
    REFERENCES knowledge_items(organization_id, id) ON DELETE CASCADE
);

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
  FOREIGN KEY (organization_id, item_id, version_id)
    REFERENCES knowledge_item_versions(organization_id, item_id, id) ON DELETE CASCADE
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
  FOREIGN KEY (organization_id, item_id, version_id)
    REFERENCES knowledge_item_versions(organization_id, item_id, id) ON DELETE CASCADE
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
  FOREIGN KEY (organization_id, item_id, version_id)
    REFERENCES knowledge_item_versions(organization_id, item_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_sources_item
  ON knowledge_sources (organization_id, item_id, version_id);
CREATE UNIQUE INDEX uq_knowledge_sources_version_source
  ON knowledge_sources (organization_id, version_id, source_type, source_id)
  WHERE version_id IS NOT NULL AND source_id IS NOT NULL;

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

ALTER TABLE knowledge_capability_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_capability_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_capability_grants_org_isolation ON knowledge_capability_grants
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_items_org_isolation ON knowledge_items
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_item_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_item_versions_org_isolation ON knowledge_item_versions
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_reviews_org_isolation ON knowledge_reviews
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_assignments_org_isolation ON knowledge_assignments
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_source_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_source_map FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_source_map_org_isolation ON knowledge_source_map
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_sources_org_isolation ON knowledge_sources
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_audit_events_org_isolation ON knowledge_audit_events
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_idempotency_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_idempotency_keys_org_isolation ON knowledge_idempotency_keys
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
