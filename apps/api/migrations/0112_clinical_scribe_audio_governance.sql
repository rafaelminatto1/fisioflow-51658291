ALTER TABLE clinical_scribe_logs
  ADD COLUMN IF NOT EXISTS capture_mode integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS capture_reason varchar(40) NOT NULL DEFAULT 'soap_section',
  ADD COLUMN IF NOT EXISTS captured_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_coverage_percent integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS audio_policy_version varchar(20) NOT NULL DEFAULT '2026-06-11',
  ADD COLUMN IF NOT EXISTS capture_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clinical_scribe_logs_capture_mode_check'
  ) THEN
    ALTER TABLE clinical_scribe_logs
      ADD CONSTRAINT clinical_scribe_logs_capture_mode_check
      CHECK (capture_mode IN (0, 30, 50, 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clinical_scribe_logs_session_coverage_check'
  ) THEN
    ALTER TABLE clinical_scribe_logs
      ADD CONSTRAINT clinical_scribe_logs_session_coverage_check
      CHECK (session_coverage_percent IN (0, 30, 50, 100));
  END IF;
END $$;
