-- Migration: Add wiki_page_id column to clinical_test_templates
ALTER TABLE clinical_test_templates ADD COLUMN IF NOT EXISTS wiki_page_id uuid;
