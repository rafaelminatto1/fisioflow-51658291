-- Migration 0062: Persist per-user agenda appearance settings

CREATE TABLE IF NOT EXISTS user_agenda_appearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  appearance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_agenda_appearance_unique
  ON user_agenda_appearance(profile_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_user_agenda_appearance_profile
  ON user_agenda_appearance(profile_id, organization_id);
