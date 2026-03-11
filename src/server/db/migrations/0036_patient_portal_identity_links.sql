ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS professional_id uuid,
  ADD COLUMN IF NOT EXISTS professional_name varchar(150);

CREATE INDEX IF NOT EXISTS idx_patients_profile_id
  ON patients (profile_id);

CREATE INDEX IF NOT EXISTS idx_patients_user_id
  ON patients (user_id);

CREATE INDEX IF NOT EXISTS idx_patients_professional_id
  ON patients (professional_id);
