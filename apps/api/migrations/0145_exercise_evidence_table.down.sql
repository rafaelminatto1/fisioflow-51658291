-- 0145_exercise_evidence_table.down.sql
-- Drop exercise_evidence table and its indexes.

DROP INDEX IF EXISTS idx_exercise_evidence_level;
DROP INDEX IF EXISTS idx_exercise_evidence_exercise;
DROP TABLE IF EXISTS exercise_evidence;