-- Core tables for Neon migration of patients and appointments.
-- This migration is idempotent and safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  full_name varchar(150) NOT NULL,
  cpf varchar(14),
  email varchar(255),
  phone varchar(20) NOT NULL,
  birth_date date,
  gender varchar(20),
  main_condition text,
  status varchar(50) NOT NULL DEFAULT 'Inicial',
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS main_condition text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'Inicial';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE patients
SET progress = GREATEST(0, LEAST(100, progress))
WHERE progress IS DISTINCT FROM GREATEST(0, LEAST(100, progress));

CREATE INDEX IF NOT EXISTS idx_patients_org_active ON patients (organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients (organization_id, full_name);
CREATE INDEX IF NOT EXISTS idx_patients_org_status ON patients (organization_id, status);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  type varchar(30) NOT NULL DEFAULT 'session',
  status varchar(30) NOT NULL DEFAULT 'scheduled',
  notes text,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_time_window CHECK (end_time > start_time)
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by uuid;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments (organization_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_org_therapist_date
  ON appointments (organization_id, therapist_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_org_patient_date
  ON appointments (organization_id, patient_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_org_status_date
  ON appointments (organization_id, status, date);
