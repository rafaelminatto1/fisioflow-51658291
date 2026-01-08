-- Migration: Fix Duplicate Columns in Appointments Table - Part 1
-- Description: Standardize date/time columns by migrating from old to new columns
-- Date: 2026-01-08

-- ============================================================
-- STEP 1: BACKUP AND DATA MIGRATION
-- ============================================================

-- Drop views that depend on the columns
DROP VIEW IF EXISTS public.appointments_full CASCADE;
DROP VIEW IF EXISTS public.therapist_stats CASCADE;
DROP VIEW IF EXISTS public.patient_appointment_summary CASCADE;

-- ============================================================
-- STEP 2: ENSURE DATA CONSISTENCY
-- ============================================================

-- First, ensure date column has all data from appointment_date
UPDATE public.appointments
SET date = appointment_date
WHERE date IS NULL AND appointment_date IS NOT NULL;

-- Ensure start_time has all data from appointment_time
UPDATE public.appointments
SET start_time = appointment_time
WHERE start_time IS NULL AND appointment_time IS NOT NULL;

-- ============================================================
-- STEP 3: MAKE NEW COLUMNS NOT NULL (if they have all data)
-- ============================================================

-- Check if we can make date NOT NULL
DO $$
DECLARE
    date_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO date_null_count
    FROM public.appointments
    WHERE date IS NULL;

    IF date_null_count = 0 THEN
        ALTER TABLE public.appointments ALTER COLUMN date SET NOT NULL;
        RAISE NOTICE 'Column date set to NOT NULL';
    ELSE
        RAISE NOTICE 'Cannot set date to NOT NULL (found % null values)', date_null_count;
    END IF;
END $$;

-- Check if we can make start_time NOT NULL
DO $$
DECLARE
    start_time_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO start_time_null_count
    FROM public.appointments
    WHERE start_time IS NULL;

    IF start_time_null_count = 0 THEN
        ALTER TABLE public.appointments ALTER COLUMN start_time SET NOT NULL;
        RAISE NOTICE 'Column start_time set to NOT NULL';
    ELSE
        RAISE NOTICE 'Cannot set start_time to NOT NULL (found % null values)', start_time_null_count;
    END IF;
END $$;

-- ============================================================
-- STEP 4: CREATE COMPARISON LOG TABLE (for verification)
-- ============================================================

CREATE TEMPORARY TABLE appointment_column_comparison AS
SELECT 
    id,
    date,
    appointment_date,
    start_time,
    appointment_time,
    CASE 
        WHEN date = appointment_date THEN 'MATCH'
        WHEN date IS NULL AND appointment_date IS NOT NULL THEN 'date NULL'
        WHEN appointment_date IS NULL AND date IS NOT NULL THEN 'appointment_date NULL'
        ELSE 'MISMATCH'
    END as date_comparison,
    CASE 
        WHEN start_time = appointment_time THEN 'MATCH'
        WHEN start_time IS NULL AND appointment_time IS NOT NULL THEN 'start_time NULL'
        WHEN appointment_time IS NULL AND start_time IS NOT NULL THEN 'appointment_time NULL'
        ELSE 'MISMATCH'
    END as time_comparison
FROM public.appointments
WHERE 
    date IS DISTINCT FROM appointment_date 
    OR start_time IS DISTINCT FROM appointment_time;

-- Log the comparison results
DO $$
DECLARE
    mismatch_count INTEGER;
    date_match_count INTEGER;
    time_match_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatch_count
    FROM appointment_column_comparison
    WHERE date_comparison = 'MISMATCH' OR time_comparison = 'MISMATCH';

    SELECT COUNT(*) INTO date_match_count
    FROM appointment_column_comparison
    WHERE date_comparison = 'MATCH';

    SELECT COUNT(*) INTO time_match_count
    FROM appointment_column_comparison
    WHERE time_comparison = 'MATCH';

    RAISE NOTICE 'Column Comparison Results: % mismatches, % date matches, % time matches', 
                 mismatch_count, date_match_count, time_match_count;
END $$;

-- ============================================================
-- STEP 5: ADD COMMENTS FOR CLARITY
-- ============================================================

COMMENT ON COLUMN public.appointments.date IS 'Appointment date - primary column (migrated from appointment_date)';
COMMENT ON COLUMN public.appointments.start_time IS 'Appointment start time - primary column (migrated from appointment_time)';
COMMENT ON COLUMN public.appointments.appointment_date IS 'LEGACY - will be removed in next migration - use date instead';
COMMENT ON COLUMN public.appointments.appointment_time IS 'LEGACY - will be removed in next migration - use start_time instead';

-- ============================================================
-- STEP 6: CREATE UPDATED VIEWS (using new columns)
-- ============================================================

-- Recreate appointments_full view using new columns
CREATE OR REPLACE VIEW public.appointments_full AS
SELECT 
    a.id,
    a.patient_id,
    a.therapist_id,
    a.date,
    a.start_time,
    a.duration,
    a.type,
    a.status,
    a.notes,
    a.room,
    a.end_time,
    a.cancellation_reason,
    a.reminder_sent,
    a.created_at,
    a.updated_at,
    -- Check if created_by exists
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'appointments' AND column_name = 'created_by')
        THEN a.created_by::uuid
        ELSE NULL::uuid
    END as created_by,
    p.name as patient_name,
    p.phone as patient_phone,
    p.email as patient_email,
    pr.full_name as therapist_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'profiles' AND column_name = 'crefito')
        THEN pr.crefito
        ELSE NULL
    END as therapist_crefito,
    CONCAT(COALESCE(a.date::text, ''), ' ', COALESCE(a.start_time::text, '')) as full_datetime
FROM public.appointments a
LEFT JOIN public.patients p ON a.patient_id = p.id
LEFT JOIN public.profiles pr ON a.therapist_id = pr.id;

-- Recreate patient_appointment_summary view using new columns
CREATE OR REPLACE VIEW public.patient_appointment_summary
WITH (security_invoker = true)
AS
SELECT 
    a.id,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    a.payment_status,
    'individual'::text AS session_type,
    a.notes,
    COALESCE(p.full_name, 'Fisioterapeuta'::text) AS therapist_name
FROM public.appointments a
LEFT JOIN profiles p ON p.id = a.therapist_id
WHERE is_patient_owner(a.patient_id);

-- Log completion
RAISE NOTICE 'Migration Part 1 completed: Data migrated and views updated';
