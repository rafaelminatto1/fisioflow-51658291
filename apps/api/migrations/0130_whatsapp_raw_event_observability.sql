ALTER TABLE wa_raw_events
  ADD COLUMN IF NOT EXISTS phone_number_id varchar(64),
  ADD COLUMN IF NOT EXISTS processing_state varchar(40) DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS provider_event_id text,
  ADD COLUMN IF NOT EXISTS signature_valid boolean,
  ADD COLUMN IF NOT EXISTS request_path text;

CREATE INDEX IF NOT EXISTS idx_wa_events_phone_number_id
  ON wa_raw_events (phone_number_id);

CREATE INDEX IF NOT EXISTS idx_wa_events_processing_state
  ON wa_raw_events (processing_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_events_provider_event_id
  ON wa_raw_events (provider_event_id);
