-- Rename 'category' to 'target_joint' as it previously held values like 'Ombro', 'Joelho'
ALTER TABLE clinical_test_templates RENAME COLUMN category TO target_joint;

-- Add new 'category' column for the type (Ortopedica, Esportiva, etc.)
ALTER TABLE clinical_test_templates ADD COLUMN category VARCHAR(100);

-- Add sensitivity_specificity
ALTER TABLE clinical_test_templates ADD COLUMN sensitivity_specificity TEXT;

-- Update the indexes
DROP INDEX IF EXISTS idx_clinical_test_templates_category;
CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_target_joint ON clinical_test_templates(target_joint);
CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_new_category ON clinical_test_templates(category);
