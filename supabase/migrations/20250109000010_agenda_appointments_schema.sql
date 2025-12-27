-- Migration: Create appointments table for agenda system
-- Description: Creates the appointments table with proper relationships and indexes

-- Desabilitar temporariamente trigger de auditoria se existir (para evitar erro de tipo)
DROP TRIGGER IF EXISTS audit_appointments_changes ON appointments;

-- Create appointments table (se não existir)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID,
    date DATE,
    appointment_date DATE,
    start_time TIME,
    appointment_time TIME,
    end_time TIME,
    status TEXT DEFAULT 'scheduled',
    payment_status TEXT DEFAULT 'pending',
    session_type TEXT DEFAULT 'individual',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas se não existirem
DO $$
BEGIN
    -- Adicionar date se não existir (usar appointment_date como fallback)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'date') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'appointment_date') THEN
            ALTER TABLE appointments ADD COLUMN date DATE;
            UPDATE appointments SET date = appointment_date WHERE date IS NULL;
        ELSE
            ALTER TABLE appointments ADD COLUMN date DATE;
        END IF;
    END IF;
    
    -- Adicionar start_time se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'start_time') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'appointment_time') THEN
            ALTER TABLE appointments ADD COLUMN start_time TIME;
            UPDATE appointments SET start_time = appointment_time WHERE start_time IS NULL;
        ELSE
            ALTER TABLE appointments ADD COLUMN start_time TIME;
        END IF;
    END IF;
    
    -- Adicionar end_time se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'end_time') THEN
        ALTER TABLE appointments ADD COLUMN end_time TIME;
    END IF;
END $$;

-- Create indexes for performance (usando COALESCE para lidar com colunas que podem não existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'date') THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
        -- Remover índice parcial com CURRENT_DATE (não é IMMUTABLE)
        -- CREATE INDEX IF NOT EXISTS idx_appointments_week ON appointments(date) 
        --     WHERE date >= CURRENT_DATE - INTERVAL '1 week';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'therapist_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'date') THEN
            CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date 
                ON appointments(therapist_id, date);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'patient_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'date') THEN
            CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
                ON appointments(patient_id, date);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'payment_status') THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
    END IF;
END $$;

-- Create composite index for conflict detection (apenas se todas as colunas existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'therapist_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'date')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'start_time')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'end_time')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'status') THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_therapist_time_conflict 
        ON appointments(therapist_id, date, start_time, end_time) 
        WHERE status NOT IN ('cancelled', 'rescheduled');
    END IF;
END $$;

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
        AND COALESCE(date, appointment_date) = p_date
        AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
        AND (
            (COALESCE(start_time, appointment_time) < p_end_time 
             AND COALESCE(end_time, COALESCE(start_time, appointment_time) + INTERVAL '1 hour') > p_start_time)
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
            IF NOT check_appointment_conflict(p_therapist_id, p_date, slot_time::TIME, end_slot_time::TIME) THEN
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
-- Comentários (apenas se as colunas existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'date') THEN
        COMMENT ON COLUMN appointments.date IS 'Date of the appointment (YYYY-MM-DD)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'session_type') THEN
        COMMENT ON COLUMN appointments.session_type IS 'Type of therapy session (individual or group)';
    END IF;
END $$;

-- Reabilitar trigger de auditoria (será corrigido em migration posterior)
-- O trigger será recriado na migration 20251219013025 após a correção da função audit_table_changes

-- Comentários (apenas se as colunas existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'start_time') THEN
        COMMENT ON COLUMN appointments.start_time IS 'Start time of the appointment (HH:MM)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'end_time') THEN
        COMMENT ON COLUMN appointments.end_time IS 'End time of the appointment (HH:MM)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'status') THEN
        COMMENT ON COLUMN appointments.status IS 'Current status of the appointment';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'payment_status') THEN
        COMMENT ON COLUMN appointments.payment_status IS 'Payment status for this session';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'session_type') THEN
        COMMENT ON COLUMN appointments.session_type IS 'Type of therapy session (individual or group)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'notes') THEN
        COMMENT ON COLUMN appointments.notes IS 'Additional notes or observations';
    END IF;
END $$;

COMMENT ON FUNCTION check_appointment_conflict IS 'Checks if a proposed appointment time conflicts with existing appointments';
COMMENT ON FUNCTION get_available_time_slots IS 'Returns available time slots for a therapist on a specific date';