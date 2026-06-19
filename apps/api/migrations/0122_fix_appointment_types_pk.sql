-- Migration 0122: Ensure appointment_types has PRIMARY KEY on id
-- Required for INSERT ... ON CONFLICT (id) upsert in PUT /appointment-types/:id to work.

DO $$
BEGIN
  -- Add PRIMARY KEY constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.appointment_types'::regclass
      AND contype = 'p'
  ) THEN
    -- First, deduplicate by id: keep the row with the most recent updated_at
    DELETE FROM appointment_types
    WHERE id NOT IN (
      SELECT DISTINCT ON (id) id
      FROM appointment_types
      ORDER BY id, updated_at DESC NULLS LAST
    );

    ALTER TABLE appointment_types
      ADD PRIMARY KEY (id);
  END IF;
END
$$;
