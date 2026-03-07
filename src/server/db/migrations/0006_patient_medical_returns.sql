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
