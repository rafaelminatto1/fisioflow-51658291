-- 0144_exercise_slug_canonicalization.sql
-- Canonicalize missing or non-ASCII exercise slugs while preserving originals for rollback.

CREATE TABLE exercise_slug_backup (
  exercise_id uuid PRIMARY KEY REFERENCES exercises(id) ON DELETE CASCADE,
  original_slug varchar(250),
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO exercise_slug_backup (exercise_id, original_slug)
SELECT id, slug
FROM exercises
WHERE slug IS NULL OR slug = '' OR slug ~ '[^a-z0-9-]'
ON CONFLICT (exercise_id) DO NOTHING;

-- Move affected rows out of the unique namespace before assigning canonical slugs.
UPDATE exercises
SET slug = 'tmp-exercise-' || replace(id::text, '-', '')
WHERE id IN (SELECT exercise_id FROM exercise_slug_backup);

DO $$
DECLARE
  exercise_row record;
  base_slug text;
  candidate_slug text;
  suffix integer;
BEGIN
  FOR exercise_row IN
    SELECT e.id, e.name
    FROM exercises e
    JOIN exercise_slug_backup b ON b.exercise_id = e.id
    ORDER BY e.created_at, e.id
  LOOP
    base_slug := trim(both '-' FROM regexp_replace(lower(unaccent(exercise_row.name)), '[^a-z0-9]+', '-', 'g'));
    IF base_slug = '' THEN
      base_slug := 'exercicio-' || replace(exercise_row.id::text, '-', '');
    END IF;

    candidate_slug := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM exercises WHERE slug = candidate_slug) LOOP
      candidate_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;

    UPDATE exercises
    SET slug = candidate_slug
    WHERE id = exercise_row.id;
  END LOOP;
END $$;
