-- Migration: Create patient home exercises table
-- Description: Stores metrics and media links for exercises performed by patients at home with AI monitoring.

CREATE TABLE IF NOT EXISTS patient_home_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL, -- Link to exercise library
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb, -- ROM, reps, compensation counts
  video_clipe_url text, -- Cloudflare R2 link
  status text NOT NULL DEFAULT 'private', -- 'shared' or 'private'
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_patient_home_exercises_patient ON patient_home_exercises(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_home_exercises_org ON patient_home_exercises(organization_id);

-- RLS Policy (Basic)
ALTER TABLE patient_home_exercises ENABLE ROW LEVEL SECURITY;

-- Professionals can see shared exercises from their patients
CREATE POLICY "Professionals can view shared patient exercises" ON patient_home_exercises
FOR SELECT
USING (
  organization_id = (SELECT organization_id FROM auth_profiles WHERE id = auth.uid())
  AND status = 'shared'
);

-- Patients can see and manage their own exercises
CREATE POLICY "Patients can manage their own exercises" ON patient_home_exercises
FOR ALL
USING (
  patient_id = (SELECT id FROM patients WHERE auth_id = auth.uid())
);
