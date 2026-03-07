CREATE TABLE IF NOT EXISTS telemedicine_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  therapist_id UUID NOT NULL,
  appointment_id UUID,
  room_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'aguardando',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  recording_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemedicine_rooms_org_created
  ON telemedicine_rooms (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemedicine_rooms_patient
  ON telemedicine_rooms (organization_id, patient_id, created_at DESC);
