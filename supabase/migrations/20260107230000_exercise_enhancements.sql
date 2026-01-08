-- Add new columns to exercises table for pathology filtering and targeting
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS indicated_pathologies TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS contraindicated_pathologies TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS body_parts TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS equipment TEXT[] DEFAULT '{}';

-- Add GIN indexes for array filtering performance
CREATE INDEX IF NOT EXISTS idx_exercises_indicated_pathologies ON exercises USING GIN (indicated_pathologies);
CREATE INDEX IF NOT EXISTS idx_exercises_contraindicated_pathologies ON exercises USING GIN (contraindicated_pathologies);
CREATE INDEX IF NOT EXISTS idx_exercises_body_parts ON exercises USING GIN (body_parts);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises USING GIN (equipment);

-- Add comments for clarity
COMMENT ON COLUMN exercises.indicated_pathologies IS 'List of pathologies where this exercise is recommended';
COMMENT ON COLUMN exercises.contraindicated_pathologies IS 'List of pathologies where this exercise should be avoided';
COMMENT ON COLUMN exercises.body_parts IS 'List of body parts targeted by this exercise';
COMMENT ON COLUMN exercises.equipment IS 'List of equipment needed for this exercise (e.g., dumbbells, elastic band, towel)';
