ALTER TABLE patient_evaluation_responses
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE patient_evaluation_responses
SET status = 'completed',
    completed_at = COALESCE(completed_at, created_at)
WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'patient_evaluation_responses_status_check'
  ) THEN
    ALTER TABLE patient_evaluation_responses
      ADD CONSTRAINT patient_evaluation_responses_status_check
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patient_evaluation_responses_patient_status_date
  ON patient_evaluation_responses (patient_id, status, scheduled_for DESC, created_at DESC);
