ALTER TABLE knowledge_items
  DROP CONSTRAINT IF EXISTS fk_knowledge_items_approved_version,
  DROP CONSTRAINT IF EXISTS fk_knowledge_items_published_version;
