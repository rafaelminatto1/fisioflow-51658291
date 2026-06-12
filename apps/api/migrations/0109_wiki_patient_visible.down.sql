DROP INDEX IF EXISTS idx_wiki_pages_patient_visible;
ALTER TABLE wiki_pages DROP COLUMN IF EXISTS patient_visible;
