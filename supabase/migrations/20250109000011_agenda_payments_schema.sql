-- Migration: Create payments table for financial control
-- Description: Creates the payments table with proper constraints and financial tracking

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('session', 'package')),
    sessions_count INTEGER CHECK (
        (payment_type = 'package' AND sessions_count > 0) OR 
        (payment_type = 'session' AND sessions_count IS NULL)
    ),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'pix', 'transfer')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure package payments have sessions_count
    CONSTRAINT payments_package_sessions CHECK (
        (payment_type = 'package' AND sessions_count IS NOT NULL AND sessions_count > 0) OR
        (payment_type = 'session')
    )
);

-- Create indexes for financial queries
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- Create patient_sessions table to track session packages
CREATE TABLE IF NOT EXISTS patient_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    used_sessions INTEGER NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
    remaining_sessions INTEGER GENERATED ALWAYS AS (total_sessions - used_sessions) STORED,
    expires_at TIMESTAMPTZ, -- Optional expiration date for packages
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure used sessions don't exceed total
    CONSTRAINT patient_sessions_usage_limit CHECK (used_sessions <= total_sessions)
);

-- Create indexes for session tracking
CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient ON patient_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_sessions_remaining ON patient_sessions(remaining_sessions) WHERE remaining_sessions > 0;
CREATE INDEX IF NOT EXISTS idx_patient_sessions_expires ON patient_sessions(expires_at) WHERE expires_at IS NOT NULL;

-- Create updated_at trigger for patient_sessions
CREATE OR REPLACE FUNCTION update_patient_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_patient_sessions_updated_at
    BEFORE UPDATE ON patient_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_sessions_updated_at();

-- Function to automatically create session package when payment is made
CREATE OR REPLACE FUNCTION create_session_package()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create package entry for package payments
    IF NEW.payment_type = 'package' AND NEW.sessions_count IS NOT NULL THEN
        INSERT INTO patient_sessions (
            patient_id,
            payment_id,
            total_sessions,
            expires_at
        )
        SELECT 
            a.patient_id,
            NEW.id,
            NEW.sessions_count,
            -- Set expiration to 6 months from payment date
            NEW.paid_at + INTERVAL '6 months'
        FROM appointments a
        WHERE a.id = NEW.appointment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_session_package
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION create_session_package();

-- Function to update appointment payment status when payment is made
CREATE OR REPLACE FUNCTION update_appointment_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
    session_price DECIMAL(10,2);
BEGIN
    -- Get total amount paid for this appointment
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM payments
    WHERE appointment_id = NEW.appointment_id;
    
    -- Get session price from patient
    SELECT p.session_price
    INTO session_price
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = NEW.appointment_id;
    
    -- Update appointment payment status
    UPDATE appointments
    SET payment_status = CASE
        WHEN total_paid >= session_price THEN 'paid'
        WHEN total_paid > 0 THEN 'partial'
        ELSE 'pending'
    END
    WHERE id = NEW.appointment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_appointment_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_payment_status();

-- Function to use session from package when appointment is completed
CREATE OR REPLACE FUNCTION use_session_from_package()
RETURNS TRIGGER AS $$
DECLARE
    package_id UUID;
BEGIN
    -- Only process when status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Find an available package for this patient
        SELECT ps.id
        INTO package_id
        FROM patient_sessions ps
        JOIN payments p ON p.id = ps.payment_id
        JOIN appointments a ON a.id = p.appointment_id
        WHERE ps.patient_id = NEW.patient_id
            AND ps.remaining_sessions > 0
            AND (ps.expires_at IS NULL OR ps.expires_at > NOW())
        ORDER BY ps.created_at ASC -- Use oldest package first
        LIMIT 1;
        
        -- If package found, use one session
        IF package_id IS NOT NULL THEN
            UPDATE patient_sessions
            SET used_sessions = used_sessions + 1
            WHERE id = package_id;
        END IF;
    END IF;
    
    -- If status changes from 'completed' to something else, return session to package
    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        -- Find the most recently used package for this patient
        SELECT ps.id
        INTO package_id
        FROM patient_sessions ps
        JOIN payments p ON p.id = ps.payment_id
        JOIN appointments a ON a.id = p.appointment_id
        WHERE ps.patient_id = NEW.patient_id
            AND ps.used_sessions > 0
        ORDER BY ps.updated_at DESC -- Most recently updated
        LIMIT 1;
        
        -- If package found, return one session
        IF package_id IS NOT NULL THEN
            UPDATE patient_sessions
            SET used_sessions = used_sessions - 1
            WHERE id = package_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_use_session_from_package
    AFTER UPDATE ON appointments
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION use_session_from_package();

-- Function to get patient financial summary
CREATE OR REPLACE FUNCTION get_patient_financial_summary(p_patient_id UUID)
RETURNS TABLE(
    total_sessions_purchased INTEGER,
    total_sessions_used INTEGER,
    total_sessions_remaining INTEGER,
    total_amount_paid DECIMAL(10,2),
    pending_payments_count INTEGER,
    last_payment_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(ps.total_sessions), 0)::INTEGER as total_sessions_purchased,
        COALESCE(SUM(ps.used_sessions), 0)::INTEGER as total_sessions_used,
        COALESCE(SUM(ps.remaining_sessions), 0)::INTEGER as total_sessions_remaining,
        COALESCE(SUM(pay.amount), 0) as total_amount_paid,
        COUNT(CASE WHEN a.payment_status = 'pending' THEN 1 END)::INTEGER as pending_payments_count,
        MAX(pay.paid_at) as last_payment_date
    FROM patients p
    LEFT JOIN appointments a ON a.patient_id = p.id
    LEFT JOIN payments pay ON pay.appointment_id = a.id
    LEFT JOIN patient_sessions ps ON ps.patient_id = p.id
    WHERE p.id = p_patient_id
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Stores payment records for physiotherapy sessions';
COMMENT ON COLUMN payments.appointment_id IS 'Reference to the appointment being paid';
COMMENT ON COLUMN payments.amount IS 'Payment amount in currency units';
COMMENT ON COLUMN payments.payment_type IS 'Type of payment: individual session or package';
COMMENT ON COLUMN payments.sessions_count IS 'Number of sessions included (for package payments only)';
COMMENT ON COLUMN payments.payment_method IS 'Method used for payment';
COMMENT ON COLUMN payments.paid_at IS 'Timestamp when payment was received';

COMMENT ON TABLE patient_sessions IS 'Tracks session packages purchased by patients';
COMMENT ON COLUMN patient_sessions.total_sessions IS 'Total sessions in the package';
COMMENT ON COLUMN patient_sessions.used_sessions IS 'Number of sessions already used';
COMMENT ON COLUMN patient_sessions.remaining_sessions IS 'Calculated remaining sessions';
COMMENT ON COLUMN patient_sessions.expires_at IS 'Optional expiration date for the package';

COMMENT ON FUNCTION get_patient_financial_summary IS 'Returns comprehensive financial summary for a patient';