-- Neon pending alignment bundle
-- Date: 2026-03-13
-- Purpose:
-- 1) Apply the additive patient/portal alignment safely
-- 2) Clean up legacy firestore_id columns only after validation
--
-- Recommended execution model:
-- - Run "PHASE 1" first
-- - Validate app/Workers flows
-- - Run "PHASE 2" only after validation

-- ============================================================================
-- PRECHECKS (read-only)
-- ============================================================================

-- Check whether the patient alignment columns already exist.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patients'
  AND column_name IN (
    'profile_id',
    'user_id',
    'professional_id',
    'professional_name',
    'incomplete_registration',
    'phone_secondary',
    'address'
  )
ORDER BY column_name;

-- Check whether legacy firestore_id columns still exist.
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'firestore_id'
  AND table_name IN (
    'appointments',
    'exercises',
    'sessions',
    'exercise_protocols',
    'exercise_templates',
    'exercise_template_items'
  )
ORDER BY table_name;

-- Check whether key clinical/financial tables already exist.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'medical_records',
    'patient_pathologies',
    'patient_surgeries',
    'doctors',
    'patient_medical_returns',
    'pathology_required_measurements',
    'evolution_measurements',
    'exercise_plans',
    'exercise_plan_items',
    'physical_examinations',
    'treatment_plans',
    'medical_attachments',
    'transacoes',
    'contas_financeiras',
    'pagamentos'
  )
ORDER BY table_name;

-- ============================================================================
-- PHASE 1 - SAFE ADDITIVE ALIGNMENT
-- Source:
-- - src/server/db/migrations/0033_patients_neon_alignment.sql
-- - src/server/db/migrations/0036_patient_portal_identity_links.sql
-- ============================================================================

BEGIN;

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

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS professional_id uuid,
  ADD COLUMN IF NOT EXISTS professional_name varchar(150);

CREATE INDEX IF NOT EXISTS idx_patients_profile_id
  ON patients (profile_id);

CREATE INDEX IF NOT EXISTS idx_patients_user_id
  ON patients (user_id);

CREATE INDEX IF NOT EXISTS idx_patients_professional_id
  ON patients (professional_id);

COMMIT;

-- Post-check for phase 1
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patients'
  AND column_name IN (
    'profile_id',
    'user_id',
    'professional_id',
    'professional_name',
    'incomplete_registration',
    'phone_secondary',
    'address'
  )
ORDER BY column_name;

-- ============================================================================
-- PHASE 2 - LEGACY CLEANUP
-- Source:
-- - src/server/db/migrations/0037_drop_legacy_firestore_columns.sql
-- Run only after Phase 1 validation and deploy verification.
-- ============================================================================

-- BEGIN;
--
-- ALTER TABLE IF EXISTS appointments
--   DROP COLUMN IF EXISTS firestore_id;
--
-- ALTER TABLE IF EXISTS exercises
--   DROP COLUMN IF EXISTS firestore_id;
--
-- ALTER TABLE IF EXISTS sessions
--   DROP COLUMN IF EXISTS firestore_id;
--
-- ALTER TABLE IF EXISTS exercise_protocols
--   DROP COLUMN IF EXISTS firestore_id;
--
-- ALTER TABLE IF EXISTS exercise_templates
--   DROP COLUMN IF EXISTS firestore_id;
--
-- ALTER TABLE IF EXISTS exercise_template_items
--   DROP COLUMN IF EXISTS firestore_id;
--
-- COMMIT;
--
-- Post-check for phase 2
-- SELECT table_name, column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name = 'firestore_id'
--   AND table_name IN (
--     'appointments',
--     'exercises',
--     'sessions',
--     'exercise_protocols',
--     'exercise_templates',
--     'exercise_template_items'
--   )
-- ORDER BY table_name;
