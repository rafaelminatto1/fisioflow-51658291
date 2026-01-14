-- Migration: Add regularity_sessions column to clinical_test_templates
-- This allows tracking how often a test should be repeated (e.g., every 4 sessions)

ALTER TABLE clinical_test_templates 
ADD COLUMN IF NOT EXISTS regularity_sessions INTEGER DEFAULT NULL;

COMMENT ON COLUMN clinical_test_templates.regularity_sessions IS 
'Número de sessões entre cada aplicação do teste (ex: 4 = repetir a cada 4 sessões)';

-- Add index for efficient filtering by regularity
CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_regularity 
ON clinical_test_templates(regularity_sessions) WHERE regularity_sessions IS NOT NULL;
