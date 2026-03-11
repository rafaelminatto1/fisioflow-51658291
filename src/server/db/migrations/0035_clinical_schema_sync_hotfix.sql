-- Hotfix de sincronização do schema clínico já existente no repositório.
-- Fonte: 0006_patient_medical_returns.sql, 0024_wearables_annotations_signatures.sql,
-- 0032_medical_records_nfse.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id_unique
  ON public.profiles (user_id);

CREATE TABLE IF NOT EXISTS patient_medical_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doctor_name TEXT,
  doctor_phone TEXT,
  return_date DATE,
  return_period TEXT,
  notes TEXT,
  report_done BOOLEAN DEFAULT false,
  report_sent BOOLEAN DEFAULT false,
  created_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_medical_returns_patient
  ON patient_medical_returns (organization_id, patient_id, return_date DESC);

CREATE TABLE IF NOT EXISTS pathology_required_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathology_name TEXT NOT NULL,
  measurement_name TEXT NOT NULL,
  measurement_unit TEXT,
  alert_level TEXT,
  instructions TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pathology_required_measurements
  ON pathology_required_measurements (organization_id, pathology_name, measurement_name);

CREATE TABLE IF NOT EXISTS evolution_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  soap_record_id UUID,
  measurement_type TEXT NOT NULL,
  measurement_name TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  notes TEXT,
  custom_data JSONB,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_measurements_patient
  ON evolution_measurements (organization_id, patient_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  created_by TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  repetitions INTEGER,
  duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_plans_patient
  ON exercise_plans (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_plan_items_plan
  ON exercise_plan_items (plan_id, order_index);

CREATE TABLE IF NOT EXISTS physical_examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  vital_signs JSONB NOT NULL DEFAULT '{}'::jsonb,
  general_appearance TEXT,
  heent TEXT,
  cardiovascular TEXT,
  respiratory TEXT,
  gastrointestinal TEXT,
  musculoskeletal TEXT,
  neurological TEXT,
  integumentary TEXT,
  psychological TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_examinations_patient_date
  ON physical_examinations (patient_id, record_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  diagnosis JSONB NOT NULL DEFAULT '[]'::jsonb,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  procedures JSONB NOT NULL DEFAULT '[]'::jsonb,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_date
  ON treatment_plans (patient_id, record_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS medical_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id UUID,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_attachments_patient_uploaded
  ON medical_attachments (patient_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_attachments_record_uploaded
  ON medical_attachments (record_id, uploaded_at DESC);
