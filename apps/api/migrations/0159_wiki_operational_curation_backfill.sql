INSERT INTO knowledge_items
  (id, organization_id, kind, title, slug, created_by)
SELECT md5(w.organization_id::text || ':wiki_pages:' || w.id::text)::uuid,
       w.organization_id, 'page', left(COALESCE(NULLIF(btrim(w.title), ''), 'Página sem título'), 500), w.slug,
       COALESCE(w.created_by, 'legacy-backfill')
  FROM wiki_pages w
 WHERE w.organization_id IS NOT NULL AND w.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_source_map
  (organization_id, source_type, source_id, knowledge_item_id)
SELECT w.organization_id, 'wiki_pages', w.id::text,
       md5(w.organization_id::text || ':wiki_pages:' || w.id::text)::uuid
  FROM wiki_pages w
 WHERE w.organization_id IS NOT NULL AND w.deleted_at IS NULL
ON CONFLICT (organization_id, source_type, source_id) DO NOTHING;

INSERT INTO knowledge_item_versions
  (id, organization_id, item_id, version_number, title, content, metadata,
   editorial_status, authored_by)
SELECT md5(w.organization_id::text || ':wiki_pages:' || w.id::text || ':v1')::uuid,
       w.organization_id,
       md5(w.organization_id::text || ':wiki_pages:' || w.id::text)::uuid,
       1, left(COALESCE(NULLIF(btrim(w.title), ''), 'Página sem título'), 500), COALESCE(w.content, ''),
       jsonb_build_object('legacyWikiPageId', w.id, 'htmlContent', w.html_content),
       CASE WHEN w.is_published THEN 'triage' ELSE 'draft' END,
       COALESCE(w.created_by, 'legacy-backfill')
  FROM wiki_pages w
 WHERE w.organization_id IS NOT NULL AND w.deleted_at IS NULL
ON CONFLICT (organization_id, item_id, version_number) DO NOTHING;

INSERT INTO knowledge_items (id, organization_id, kind, title, created_by)
SELECT md5(a.organization_id::text || ':knowledge_articles:' || a.article_id::text)::uuid,
       a.organization_id, 'source', left(COALESCE(NULLIF(btrim(a.title), ''), 'Fonte sem título'), 500),
       COALESCE(a.created_by::text, 'legacy-backfill')
  FROM knowledge_articles a
 WHERE a.organization_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_source_map
  (organization_id, source_type, source_id, knowledge_item_id)
SELECT a.organization_id, 'knowledge_articles', a.article_id::text,
       md5(a.organization_id::text || ':knowledge_articles:' || a.article_id::text)::uuid
  FROM knowledge_articles a
 WHERE a.organization_id IS NOT NULL
ON CONFLICT (organization_id, source_type, source_id) DO NOTHING;

INSERT INTO knowledge_item_versions
  (id, organization_id, item_id, version_number, title, content, metadata,
   editorial_status, authored_by)
SELECT md5(a.organization_id::text || ':knowledge_articles:' || a.article_id::text || ':v1')::uuid,
       a.organization_id,
       md5(a.organization_id::text || ':knowledge_articles:' || a.article_id::text)::uuid,
       1, left(COALESCE(NULLIF(btrim(a.title), ''), 'Fonte sem título'), 500),
       COALESCE(a.raw_text, a.summary, ''),
       jsonb_build_object('legacyEvidence', a.evidence), 'triage',
       COALESCE(a.created_by::text, 'legacy-backfill')
  FROM knowledge_articles a
 WHERE a.organization_id IS NOT NULL
ON CONFLICT (organization_id, item_id, version_number) DO NOTHING;

INSERT INTO knowledge_sources
  (organization_id, item_id, version_id, source_type, source_id, title, url)
SELECT a.organization_id,
       md5(a.organization_id::text || ':knowledge_articles:' || a.article_id::text)::uuid,
       md5(a.organization_id::text || ':knowledge_articles:' || a.article_id::text || ':v1')::uuid,
       'knowledge_articles', a.article_id::text,
       COALESCE(NULLIF(a.title, ''), 'Fonte sem título'), a.url
  FROM knowledge_articles a
 WHERE a.organization_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM knowledge_sources s
      WHERE s.organization_id = a.organization_id
        AND s.source_type = 'knowledge_articles'
        AND s.source_id = a.article_id::text
   );

INSERT INTO knowledge_items (id, organization_id, kind, title, created_by)
SELECT md5(oe.organization_id::text || ':organization_evidence:' || oe.article_id::text)::uuid,
       oe.organization_id, 'source',
       left(COALESCE(NULLIF(btrim(ea.title), ''), er.doi, er.pmid, 'Fonte científica sem título'), 500),
       COALESCE(oe.imported_by, 'legacy-backfill')
  FROM organization_evidence oe
  JOIN evidence_resources er ON er.article_id = oe.article_id
  LEFT JOIN evidence_articles ea ON ea.pmid = er.pmid
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_source_map
  (organization_id, source_type, source_id, knowledge_item_id)
SELECT oe.organization_id, 'organization_evidence', oe.article_id::text,
       md5(oe.organization_id::text || ':organization_evidence:' || oe.article_id::text)::uuid
  FROM organization_evidence oe
ON CONFLICT (organization_id, source_type, source_id) DO NOTHING;

INSERT INTO knowledge_item_versions
  (id, organization_id, item_id, version_number, title, editorial_status, authored_by)
SELECT md5(oe.organization_id::text || ':organization_evidence:' || oe.article_id::text || ':v1')::uuid,
       oe.organization_id,
       md5(oe.organization_id::text || ':organization_evidence:' || oe.article_id::text)::uuid,
       1, left(COALESCE(NULLIF(btrim(ea.title), ''), er.doi, er.pmid, 'Fonte científica sem título'), 500),
       'triage', COALESCE(oe.imported_by, 'legacy-backfill')
  FROM organization_evidence oe
  JOIN evidence_resources er ON er.article_id = oe.article_id
  LEFT JOIN evidence_articles ea ON ea.pmid = er.pmid
ON CONFLICT (organization_id, item_id, version_number) DO NOTHING;

INSERT INTO knowledge_sources
  (organization_id, item_id, version_id, source_type, source_id, title, doi, pmid)
SELECT oe.organization_id,
       md5(oe.organization_id::text || ':organization_evidence:' || oe.article_id::text)::uuid,
       md5(oe.organization_id::text || ':organization_evidence:' || oe.article_id::text || ':v1')::uuid,
       'evidence_resources', oe.article_id::text,
       COALESCE(ea.title, er.doi, er.pmid, 'Fonte científica sem título'), er.doi, er.pmid
  FROM organization_evidence oe
  JOIN evidence_resources er ON er.article_id = oe.article_id
  LEFT JOIN evidence_articles ea ON ea.pmid = er.pmid
 WHERE NOT EXISTS (
   SELECT 1 FROM knowledge_sources s
    WHERE s.organization_id = oe.organization_id
      AND s.source_type = 'evidence_resources'
      AND s.source_id = oe.article_id::text
 );

WITH first_manager AS (
  SELECT DISTINCT ON (organization_id)
         organization_id, user_id
    FROM profiles
   WHERE organization_id IS NOT NULL
     AND user_id IS NOT NULL
     AND is_active IS NOT FALSE
     AND (
       role IN ('owner', 'admin')
       OR COALESCE(roles, ARRAY[]::text[]) && ARRAY['owner', 'admin']::text[]
     )
   ORDER BY organization_id,
            CASE WHEN role = 'owner' OR 'owner' = ANY(COALESCE(roles, ARRAY[]::text[])) THEN 0 ELSE 1 END,
            created_at ASC, id ASC
), bootstrap_capabilities(capability) AS (
  VALUES ('manage_library'), ('publish_knowledge'), ('manage_library_policy')
)
INSERT INTO knowledge_capability_grants
  (organization_id, user_id, capability, granted_by, reason)
SELECT manager.organization_id, manager.user_id, capability.capability,
       manager.user_id, 'bootstrap gestor inicial — migration 0158'
  FROM first_manager manager CROSS JOIN bootstrap_capabilities capability
ON CONFLICT (organization_id, user_id, capability) DO NOTHING;

WITH first_manager AS (
  SELECT DISTINCT ON (organization_id) organization_id, user_id
    FROM profiles
   WHERE organization_id IS NOT NULL AND user_id IS NOT NULL AND is_active IS NOT FALSE
     AND (role IN ('owner', 'admin') OR COALESCE(roles, ARRAY[]::text[]) && ARRAY['owner', 'admin']::text[])
   ORDER BY organization_id,
            CASE WHEN role = 'owner' OR 'owner' = ANY(COALESCE(roles, ARRAY[]::text[])) THEN 0 ELSE 1 END,
            created_at ASC, id ASC
), first_clinical_reviewer AS (
  SELECT DISTINCT ON (organization_id) organization_id, user_id
    FROM profiles
   WHERE organization_id IS NOT NULL AND user_id IS NOT NULL AND is_active IS NOT FALSE
     AND crefito IS NOT NULL AND btrim(crefito) <> ''
     AND (role = 'fisioterapeuta' OR 'fisioterapeuta' = ANY(COALESCE(roles, ARRAY[]::text[])))
   ORDER BY organization_id, created_at ASC, id ASC
)
INSERT INTO knowledge_capability_grants
  (organization_id, user_id, capability, granted_by, reason)
SELECT reviewer.organization_id, reviewer.user_id, 'clinical_review', manager.user_id,
       'bootstrap revisor clínico credenciado — migration 0158'
  FROM first_clinical_reviewer reviewer
  JOIN first_manager manager USING (organization_id)
 WHERE reviewer.user_id <> manager.user_id
ON CONFLICT (organization_id, user_id, capability) DO NOTHING;
