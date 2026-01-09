-- Add media_placeholder_keywords for image search (Schema Fix)
ALTER TABLE clinical_test_templates ADD COLUMN media_placeholder_keywords TEXT[];
