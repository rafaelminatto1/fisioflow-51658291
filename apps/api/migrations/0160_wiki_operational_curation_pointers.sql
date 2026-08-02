ALTER TABLE knowledge_items
  ADD CONSTRAINT fk_knowledge_items_approved_version
    FOREIGN KEY (organization_id, id, approved_version_id)
    REFERENCES knowledge_item_versions(organization_id, item_id, id)
    ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT fk_knowledge_items_published_version
    FOREIGN KEY (organization_id, id, published_version_id)
    REFERENCES knowledge_item_versions(organization_id, item_id, id)
    ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
