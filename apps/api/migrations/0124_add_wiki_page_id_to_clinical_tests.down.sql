-- Rollback: Remove wiki_page_id column from clinical_test_templates
ALTER TABLE clinical_test_templates DROP COLUMN IF EXISTS wiki_page_id;
