-- 0143_exercise_difficulty_not_null.sql
-- Ensure exercises.difficulty is NOT NULL with default 'iniciante'
-- Pre-check: 0 rows with NULL difficulty (verified 2026-07-23)

-- Step 1: Set default value for future inserts
ALTER TABLE exercises
  ALTER COLUMN difficulty SET DEFAULT 'iniciante';

-- Step 2: Backfill any NULLs (safety net — 0 expected)
UPDATE exercises
  SET difficulty = 'iniciante'
  WHERE difficulty IS NULL;

-- Step 3: Enforce NOT NULL
ALTER TABLE exercises
  ALTER COLUMN difficulty SET NOT NULL;
