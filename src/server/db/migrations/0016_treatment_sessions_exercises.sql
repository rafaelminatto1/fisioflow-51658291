ALTER TABLE treatment_sessions
  ADD COLUMN IF NOT EXISTS exercises_performed JSONB DEFAULT '[]'::jsonb;
