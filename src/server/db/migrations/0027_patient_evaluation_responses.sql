CREATE TABLE IF NOT EXISTS patient_evaluation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES evaluation_forms(id) ON DELETE CASCADE,
  appointment_id UUID NULL,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_evaluation_responses_patient
  ON patient_evaluation_responses (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_evaluation_responses_form
  ON patient_evaluation_responses (form_id, created_at DESC);
