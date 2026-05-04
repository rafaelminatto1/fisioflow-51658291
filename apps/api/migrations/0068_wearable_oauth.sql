-- Sprint 9: Wearable OAuth tokens + metadata enrichment

-- Store OAuth credentials per patient per platform
CREATE TABLE IF NOT EXISTS wearable_oauth_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id      UUID NOT NULL,
  provider        TEXT NOT NULL,   -- garmin, strava, oura, google_fit
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  scope           TEXT,
  provider_user_id TEXT,
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at  TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (patient_id, provider)
);

-- Add metadata column to wearable_data for richer payloads
ALTER TABLE wearable_data ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for fast patient+source queries
CREATE INDEX IF NOT EXISTS idx_wearable_data_patient_source ON wearable_data(patient_id, source, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_oauth_patient ON wearable_oauth_tokens(patient_id, provider) WHERE is_active = true;
