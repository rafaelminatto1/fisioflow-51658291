-- Migration: Add symmetry and trajectory data to biomechanics assessments
-- Description: Supports advanced biomechanical analysis with L/R symmetry scores and motion trajectory history.

-- 1. Add new columns to biomechanics_assessments
ALTER TABLE biomechanics_assessments 
ADD COLUMN IF NOT EXISTS symmetry_score numeric,
ADD COLUMN IF NOT EXISTS trajectory_data jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_validation_status text DEFAULT 'pending';

-- 2. Add comment for documentation
COMMENT ON COLUMN biomechanics_assessments.trajectory_data IS 'Store articular coordinates frame-by-frame for motion curve generation.';
