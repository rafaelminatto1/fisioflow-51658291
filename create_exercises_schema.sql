-- Simplified schema for exercises table seeding
-- Removes dependencies on missing organizations/profiles tables

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,  -- Added based on seed script usage (upsert on slug)
  description TEXT,
  instructions TEXT, -- Changed from TEXT[] to TEXT based on seed script providing JSON string
  video_url TEXT,
  image_url TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  duration_minutes INTEGER, -- Changed from duration_seconds based on seed script
  equipment TEXT, -- Changed from TEXT[] based on seed script
  muscles TEXT,   -- Changed columns based on seed script usage which sends JSON
  sets_recommended TEXT,
  reps_recommended TEXT,
  precautions TEXT,
  benefits TEXT,
  tags TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  organization_id UUID, -- Removed REFERENCES
  created_by UUID,      -- Removed REFERENCES
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_is_active ON exercises(is_active);
CREATE INDEX IF NOT EXISTS idx_exercises_slug ON exercises(slug);
