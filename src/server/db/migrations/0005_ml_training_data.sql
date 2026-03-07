-- Create ML training dataset table for analytics/prediction pipelines.
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_hash TEXT NOT NULL,
  age_group TEXT NOT NULL DEFAULT 'unknown',
  gender TEXT NOT NULL DEFAULT 'unknown',
  primary_pathology TEXT NOT NULL DEFAULT 'unknown',
  chronic_condition BOOLEAN NOT NULL DEFAULT false,
  baseline_pain_level NUMERIC(10,2) NOT NULL DEFAULT 0,
  baseline_functional_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  treatment_type TEXT NOT NULL DEFAULT 'physical_therapy',
  session_frequency_weekly NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  attendance_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  home_exercise_compliance NUMERIC(10,4) NOT NULL DEFAULT 0,
  portal_login_frequency NUMERIC(10,4) NOT NULL DEFAULT 0,
  outcome_category TEXT NOT NULL DEFAULT 'partial',
  sessions_to_discharge INTEGER NOT NULL DEFAULT 0,
  pain_reduction_percentage NUMERIC(10,2) NOT NULL DEFAULT 0,
  functional_improvement_percentage NUMERIC(10,2) NOT NULL DEFAULT 0,
  patient_satisfaction_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_collection_period_start TIMESTAMPTZ,
  data_collection_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upsert key by tenant + anonymized patient.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_training_data_org_hash
  ON ml_training_data (organization_id, patient_hash);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_org_pathology
  ON ml_training_data (organization_id, primary_pathology);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_org_created_at
  ON ml_training_data (organization_id, created_at DESC);
