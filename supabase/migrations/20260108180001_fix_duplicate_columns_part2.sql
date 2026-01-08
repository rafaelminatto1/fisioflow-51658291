-- Migration: Fix Duplicate Columns in Appointments Table - Part 2
-- Description: Remove old columns and clean up
-- Date: 2026-01-08
-- DEPENDS ON: 20260108180000_fix_duplicate_columns_part1

-- ============================================================
-- STEP 1: DROP OLD COLUMNS
-- ============================================================

-- Drop the legacy appointment_date column
ALTER TABLE public.appointments DROP COLUMN IF EXISTS appointment_date;

-- Drop the legacy appointment_time column
ALTER TABLE public.appointments DROP COLUMN IF EXISTS appointment_time;

-- ============================================================
-- STEP 2: UPDATE INDEXES
-- ============================================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_appointments_appointment_date CASCADE;
DROP INDEX IF EXISTS idx_appointments_appointment_time CASCADE;

-- Ensure we have indexes on the new columns
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);

-- Ensure composite index uses new columns
DROP INDEX IF EXISTS idx_appointments_therapist_date CASCADE;
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date 
    ON public.appointments(therapist_id, date);

DROP INDEX IF EXISTS idx_appointments_patient_date CASCADE;
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
    ON public.appointments(patient_id, date);

-- ============================================================
-- STEP 3: UPDATE CONFLICT DETECTION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_therapist_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM public.appointments
    WHERE therapist_id = p_therapist_id
        AND date = p_date
        AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
        AND (
            (start_time < p_end_time 
             AND COALESCE(end_time, start_time + INTERVAL '1 hour') > p_start_time)
        );
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 4: UPDATE TRIGGER FUNCTIONS
-- ============================================================

-- Update available time slots function
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_therapist_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(time_slot TIME) AS $$
DECLARE
    slot_time TIME;
    end_slot_time TIME;
    slot_duration INTERVAL;
BEGIN
    slot_duration := (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Generate 30-minute slots from 7:00 to 18:30
    FOR slot_time IN 
        SELECT generate_series('07:00:00'::TIME, '18:30:00'::TIME, '30 minutes'::INTERVAL)::TIME
    LOOP
        end_slot_time := slot_time + slot_duration;
        
        -- Check if slot fits within business hours
        IF end_slot_time <= '19:00:00'::TIME THEN
            -- Check if slot is available (no conflicts)
            IF NOT check_appointment_conflict(p_therapist_id, p_date, slot_time::TIME, end_slot_time::TIME) THEN
                time_slot := slot_time;
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 5: UPDATE COMMENTS
-- ============================================================

COMMENT ON COLUMN public.appointments.date IS 'Appointment date (YYYY-MM-DD)';
COMMENT ON COLUMN public.appointments.start_time IS 'Appointment start time (HH:MM)';
COMMENT ON COLUMN public.appointments.end_time IS 'Appointment end time (HH:MM)';

-- ============================================================
-- STEP 6: CLEANUP
-- ============================================================

-- Drop the temporary comparison table
DROP TABLE IF EXISTS appointment_column_comparison;

-- Log completion
RAISE NOTICE 'Migration Part 2 completed: Old columns removed and functions updated';
