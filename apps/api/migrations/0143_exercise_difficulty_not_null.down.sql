-- 0143_exercise_difficulty_not_null.down.sql
-- Revert NOT NULL constraint on exercises.difficulty

ALTER TABLE exercises
  ALTER COLUMN difficulty DROP NOT NULL;

ALTER TABLE exercises
  ALTER COLUMN difficulty DROP DEFAULT;
