-- Ensure patient_predictions exists with baseline columns used by analytics Workers routes.
CREATE TABLE IF NOT EXISTS patient_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  prediction_type TEXT NOT NULL,
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_value NUMERIC(10,2),
  predicted_class TEXT,
  confidence_score NUMERIC(10,4) NOT NULL DEFAULT 0,
  confidence_interval JSONB,
  target_date TIMESTAMPTZ,
  timeframe_days INTEGER,
  model_version TEXT NOT NULL DEFAULT 'custom',
  model_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  treatment_recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  similar_cases JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill older schemas that might have the table without full metadata.
ALTER TABLE patient_predictions
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS predicted_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS predicted_class TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_interval JSONB,
  ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timeframe_days INTEGER,
  ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS treatment_recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS similar_cases JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_patient_predictions_org_patient_date
  ON patient_predictions (organization_id, patient_id, prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_patient_predictions_org_patient_active
  ON patient_predictions (organization_id, patient_id, is_active);

CREATE INDEX IF NOT EXISTS idx_patient_predictions_org_type_date
  ON patient_predictions (organization_id, prediction_type, prediction_date DESC);
