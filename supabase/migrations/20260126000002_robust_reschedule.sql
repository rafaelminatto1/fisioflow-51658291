-- Create a robust function to handle rescheduling
-- This ensures that start/end times remain consistent and validates inputs at the database level

CREATE OR REPLACE FUNCTION public.reschedule_appointment(
    p_appointment_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (usually postgres/admin), use carefully with RLS
AS $$
DECLARE
    v_end_time TIME;
    v_updated_record JSONB;
BEGIN
    -- 1. Calculate End Time
    -- We cast to timestamp to perform addition, then back to time
    v_end_time := (p_date + p_start_time) + (p_duration_minutes || ' minutes')::INTERVAL;

    -- 2. Update the appointment
    -- We update both the new standardized columns (date, start_time, end_time)
    -- AND the legacy columns (appointment_date, appointment_time) to maintain compatibility
    UPDATE public.appointments
    SET 
        date = p_date,
        start_time = p_start_time,
        end_time = v_end_time,
        appointment_date = p_date, -- Legacy support
        appointment_time = p_start_time, -- Legacy support
        updated_at = NOW(),
        status = CASE 
            WHEN status = 'cancelado' THEN 'agendado' -- Reactivate if it was cancelled logic (optional, but good for UX)
            ELSE status 
        END
    WHERE id = p_appointment_id
    RETURNING to_jsonb(appointments.*) INTO v_updated_record;

    IF v_updated_record IS NULL THEN
        RAISE EXCEPTION 'Appointment not found or permission denied';
    END IF;

    RETURN v_updated_record;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reschedule_appointment(UUID, DATE, TIME, INTEGER) TO authenticated;

-- Comment to document usage
COMMENT ON FUNCTION public.reschedule_appointment IS 'Reschedules an appointment, automatically calculating end_time and keeping legacy columns in sync.';
