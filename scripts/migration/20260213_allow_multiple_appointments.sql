-- Migration to allow multiple appointments per slot (respecting capacity settings)
-- Created: 2026-02-13

DO $$
BEGIN
    -- Drop the unique index if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'idx_appointments_time_conflict'
    ) THEN
        DROP INDEX idx_appointments_time_conflict;
    END IF;

    -- Create it again as a regular INDEX (not unique) for performance
    -- This allows multiple appointments for the same therapist/time
    CREATE INDEX idx_appointments_time_conflict
    ON appointments(therapist_id, date, start_time, end_time)
    WHERE status NOT IN ('cancelado', 'no_show');

END $$;
