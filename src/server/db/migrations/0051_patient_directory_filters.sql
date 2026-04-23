-- Migration 0051: patient directory structured filters
-- Adds structured metadata used by the patient management cockpit.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS care_profiles text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS sports_practiced text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS therapy_focuses text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS payer_model varchar(50);

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS partner_company_name varchar(150);

CREATE INDEX IF NOT EXISTS idx_patients_org_origin
  ON patients (organization_id, origin);

CREATE INDEX IF NOT EXISTS idx_patients_org_payer_model
  ON patients (organization_id, payer_model);

CREATE INDEX IF NOT EXISTS idx_patients_org_partner_company
  ON patients (organization_id, partner_company_name);
