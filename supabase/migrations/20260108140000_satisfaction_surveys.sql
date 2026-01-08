-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create satisfaction_surveys table
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL, -- Assumes organizations table exists
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  therapist_id UUID REFERENCES profiles(id),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  q_care_quality INTEGER CHECK (q_care_quality >= 1 AND q_care_quality <= 5),
  q_professionalism INTEGER CHECK (q_professionalism >= 1 AND q_professionalism <= 5),
  q_facility_cleanliness INTEGER CHECK (q_facility_cleanliness >= 1 AND q_facility_cleanliness <= 5),
  q_scheduling_ease INTEGER CHECK (q_scheduling_ease >= 1 AND q_scheduling_ease <= 5),
  q_communication INTEGER CHECK (q_communication >= 1 AND q_communication <= 5),
  comments TEXT,
  suggestions TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  response_time_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_surveys_patient_id ON satisfaction_surveys(patient_id);
CREATE INDEX IF NOT EXISTS idx_surveys_appointment_id ON satisfaction_surveys(appointment_id);
CREATE INDEX IF NOT EXISTS idx_surveys_therapist_id ON satisfaction_surveys(therapist_id);
CREATE INDEX IF NOT EXISTS idx_surveys_organization_id ON satisfaction_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_surveys_nps_score ON satisfaction_surveys(nps_score);

-- Policies

-- Patients can view their own surveys (or surveys linked to them)
CREATE POLICY "Patients can view own surveys"
ON satisfaction_surveys FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = satisfaction_surveys.patient_id
  )
);

-- Patients can update/submit their surveys
CREATE POLICY "Patients can update own surveys"
ON satisfaction_surveys FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = satisfaction_surveys.patient_id
  )
);

-- Therapists/Admins can view surveys for their organization
CREATE POLICY "Therapists and Admins can view organization surveys"
ON satisfaction_surveys FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (role IN ('admin', 'fisioterapeuta', 'estagiario'))
    AND (
      organization_id = satisfaction_surveys.organization_id 
      OR 
      -- fallback if organization_id on profile is null or mismatch, maybe check direct therapist link?
      id = satisfaction_surveys.therapist_id
    )
  )
);

-- Therapists can create surveys (e.g. sending them)
CREATE POLICY "Therapists can create surveys"
ON satisfaction_surveys FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_satisfaction_surveys_modtime
    BEFORE UPDATE ON satisfaction_surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
