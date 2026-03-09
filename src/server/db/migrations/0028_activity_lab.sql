CREATE TABLE IF NOT EXISTS activity_lab_clinic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  clinic_name varchar(150) NOT NULL,
  professional_name varchar(150),
  registration_number varchar(80),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_lab_clinic_profiles_org
  ON activity_lab_clinic_profiles (organization_id);

CREATE TABLE IF NOT EXISTS activity_lab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  protocol_name varchar(160) NOT NULL,
  body_part varchar(120) NOT NULL,
  side varchar(10) NOT NULL DEFAULT 'LEFT',
  test_type varchar(40) NOT NULL DEFAULT 'isometric',
  peak_force numeric(10,2) NOT NULL DEFAULT 0,
  avg_force numeric(10,2) NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 0,
  rfd numeric(10,2) NOT NULL DEFAULT 0,
  sensitivity integer NOT NULL DEFAULT 3,
  raw_force_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  sample_rate integer NOT NULL DEFAULT 80,
  device_model varchar(120) NOT NULL DEFAULT 'Tindeq',
  device_firmware varchar(120) NOT NULL DEFAULT '',
  device_battery integer NOT NULL DEFAULT 0,
  measurement_mode varchar(40) NOT NULL DEFAULT 'isometric',
  is_simulated boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_lab_sessions_org_patient_created
  ON activity_lab_sessions (organization_id, patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_lab_sessions_org_created
  ON activity_lab_sessions (organization_id, created_at DESC);
