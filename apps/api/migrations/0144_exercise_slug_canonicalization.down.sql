-- 0144_exercise_slug_canonicalization.down.sql
-- Restore the original slug values captured by the forward migration.

UPDATE exercises
SET slug = 'tmp-exercise-rollback-' || replace(id::text, '-', '')
WHERE id IN (SELECT exercise_id FROM exercise_slug_backup);

UPDATE exercises e
SET slug = b.original_slug
FROM exercise_slug_backup b
WHERE e.id = b.exercise_id;

DROP TABLE exercise_slug_backup;
