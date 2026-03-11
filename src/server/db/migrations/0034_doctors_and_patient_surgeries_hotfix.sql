-- Production hotfix for Workers routes that expect doctors and patient_surgeries.
-- Keep this migration idempotent so it is safe to rerun on Neon.

CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  crm text,
  crm_state text,
  phone text,
  email text,
  clinic_name text,
  clinic_address text,
  clinic_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctors_org_active
  ON doctors (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_doctors_specialty
  ON doctors (specialty)
  WHERE specialty IS NOT NULL;

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
