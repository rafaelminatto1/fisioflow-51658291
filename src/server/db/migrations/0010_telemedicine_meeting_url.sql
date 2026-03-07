ALTER TABLE telemedicine_rooms
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT;

UPDATE telemedicine_rooms
SET
  meeting_provider = COALESCE(meeting_provider, 'jitsi'),
  meeting_url = COALESCE(meeting_url, 'https://meet.jit.si/fisioflow-' || lower(room_code))
WHERE meeting_url IS NULL OR meeting_provider IS NULL;
