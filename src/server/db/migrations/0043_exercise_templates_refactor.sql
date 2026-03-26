-- Migration: Exercise Templates Refactor
-- Adds template_type, patient_profile, source_template_id, is_draft, exercise_count
-- to the existing exercise_templates table, plus performance indexes.
-- Requirements: 1.1, 5.1, 5.4

ALTER TABLE exercise_templates
  ADD COLUMN IF NOT EXISTS template_type    TEXT NOT NULL DEFAULT 'custom'
                              CHECK (template_type IN ('system', 'custom')),
  ADD COLUMN IF NOT EXISTS patient_profile  TEXT
                              CHECK (patient_profile IN (
                                'ortopedico','esportivo','pos_operatorio',
                                'prevencao','idosos'
                              )),
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES exercise_templates(id)
                              ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_draft         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exercise_count   INTEGER NOT NULL DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_templates_type
  ON exercise_templates(template_type);

CREATE INDEX IF NOT EXISTS idx_exercise_templates_profile
  ON exercise_templates(patient_profile);

CREATE INDEX IF NOT EXISTS idx_exercise_templates_org
  ON exercise_templates(organization_id);
