-- Align the patient domain with the current Neon + Cloudflare Workers contract.
-- This migration is idempotent and keeps compatibility with existing data.

ALTER TABLE patients ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_secondary varchar(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS rg varchar(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profession varchar(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS observations text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS incomplete_registration boolean NOT NULL DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_data boolean DEFAULT true;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_image boolean DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type varchar(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_kg numeric(6,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height_cm numeric(6,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status varchar(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS education_level varchar(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS session_value numeric(10,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS origin varchar(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_by varchar(150);

CREATE INDEX IF NOT EXISTS idx_patients_org_incomplete
  ON patients (organization_id, incomplete_registration, created_at DESC);

CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint text,
  medical_history text,
  current_medications text,
  allergies text,
  previous_surgeries text,
  family_history text,
  lifestyle_habits text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_date
  ON medical_records (organization_id, patient_id, record_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_pathologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  pathology_name text NOT NULL,
  cid_code text,
  diagnosis_date date,
  severity text,
  affected_region text,
  status text NOT NULL DEFAULT 'ativo',
  treated_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_pathologies_patient
  ON patient_pathologies (organization_id, patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  surgery_name text NOT NULL,
  surgery_date date,
  surgeon_name text,
  hospital text,
  post_op_protocol text,
  surgery_type text,
  affected_side text,
  complications text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_surgeries_patient
  ON patient_surgeries (organization_id, patient_id, surgery_date DESC, created_at DESC);
