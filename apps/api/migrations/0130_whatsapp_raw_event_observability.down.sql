DROP INDEX IF EXISTS idx_wa_events_provider_event_id;
DROP INDEX IF EXISTS idx_wa_events_processing_state;
DROP INDEX IF EXISTS idx_wa_events_phone_number_id;

ALTER TABLE wa_raw_events
  DROP COLUMN IF EXISTS request_path,
  DROP COLUMN IF EXISTS signature_valid,
  DROP COLUMN IF EXISTS provider_event_id,
  DROP COLUMN IF EXISTS failure_reason,
  DROP COLUMN IF EXISTS processing_state,
  DROP COLUMN IF EXISTS phone_number_id;
