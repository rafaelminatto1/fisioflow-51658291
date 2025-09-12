-- Migration: Create appointments table for agenda system
-- Description: Creates the appointments table with proper relationships and indexes

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled', 'rescheduled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
    session_type TEXT NOT NULL DEFAULT 'individual' CHECK (session_type IN ('individual', 'group')),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT appointments_time_order CHECK (end_time > start_time),
    CONSTRAINT appointments_business_hours CHECK (
        start_time >= '07:00:00' AND 
        end_time <= '19:00:00'
    ),
    CONSTRAINT appointments_date_future CHECK (date >= CURRENT_DATE - INTERVAL '1 year')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date ON appointments(therapist_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_week ON appointments(date) WHERE date >= CURRENT_DATE - INTERVAL '1 week';

-- Create composite index for conflict detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_therapist_time_conflict 
ON appointments(therapist_id, date, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'rescheduled');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointments_updated_at();

-- Create function to check time conflicts
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
    FROM appointments
    WHERE therapist_id = p_therapist_id
        AND date = p_date
        AND status NOT IN ('cancelled', 'rescheduled')
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        );
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to get available time slots
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
            IF NOT check_appointment_conflict(p_therapist_id, p_date, slot_time, end_slot_time) THEN
                time_slot := slot_time;
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE appointments IS 'Stores physiotherapy appointment scheduling data';
COMMENT ON COLUMN appointments.patient_id IS 'Reference to the patient receiving treatment';
COMMENT ON COLUMN appointments.therapist_id IS 'Reference to the therapist conducting the session';
COMMENT ON COLUMN appointments.date IS 'Date of the appointment (YYYY-MM-DD)';
COMMENT ON COLUMN appointments.start_time IS 'Start time of the appointment (HH:MM)';
COMMENT ON COLUMN appointments.end_time IS 'End time of the appointment (HH:MM)';
COMMENT ON COLUMN appointments.status IS 'Current status of the appointment';
COMMENT ON COLUMN appointments.payment_status IS 'Payment status for this session';
COMMENT ON COLUMN appointments.session_type IS 'Type of therapy session (individual or group)';
COMMENT ON COLUMN appointments.notes IS 'Additional notes or observations';

COMMENT ON FUNCTION check_appointment_conflict IS 'Checks if a proposed appointment time conflicts with existing appointments';
COMMENT ON FUNCTION get_available_time_slots IS 'Returns available time slots for a therapist on a specific date';