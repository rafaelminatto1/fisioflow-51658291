-- Migration 0059: Patient streaks table for HEP gamification
-- Tracks daily exercise streaks for the patient app

CREATE TABLE IF NOT EXISTS patient_streaks (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_streaks_last_activity ON patient_streaks(last_activity_date);

-- Ensure xp_transactions has needed columns
ALTER TABLE xp_transactions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE xp_transactions ADD COLUMN IF NOT EXISTS metadata JSONB;
