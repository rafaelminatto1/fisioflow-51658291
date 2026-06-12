ALTER TABLE clinical_scribe_logs
  DROP CONSTRAINT IF EXISTS clinical_scribe_logs_session_coverage_check,
  DROP CONSTRAINT IF EXISTS clinical_scribe_logs_capture_mode_check,
  DROP COLUMN IF EXISTS capture_metadata,
  DROP COLUMN IF EXISTS audio_policy_version,
  DROP COLUMN IF EXISTS session_coverage_percent,
  DROP COLUMN IF EXISTS captured_seconds,
  DROP COLUMN IF EXISTS capture_reason,
  DROP COLUMN IF EXISTS capture_mode;
