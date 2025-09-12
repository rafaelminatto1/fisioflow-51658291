-- Migration: Configure Row Level Security for agenda system
-- Description: Sets up RLS policies for appointments, payments, and patient_sessions

-- Enable RLS on all tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
        'patient'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is patient owner
CREATE OR REPLACE FUNCTION is_patient_owner(patient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM patients 
        WHERE id = patient_id 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- APPOINTMENTS RLS POLICIES

-- Admin and therapist can see all appointments
CREATE POLICY "Admin and therapist can view all appointments"
ON appointments FOR SELECT
USING (
    get_user_role() IN ('admin', 'therapist')
);

-- Intern can view all appointments (read-only access)
CREATE POLICY "Intern can view all appointments"
ON appointments FOR SELECT
USING (
    get_user_role() = 'intern'
);

-- Patient can only see their own appointments
CREATE POLICY "Patient can view own appointments"
ON appointments FOR SELECT
USING (
    get_user_role() = 'patient' AND is_patient_owner(patient_id)
);

-- Admin and therapist can create appointments
CREATE POLICY "Admin and therapist can create appointments"
ON appointments FOR INSERT
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
);

-- Admin and therapist can update appointments
CREATE POLICY "Admin and therapist can update appointments"
ON appointments FOR UPDATE
USING (
    get_user_role() IN ('admin', 'therapist')
)
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
);

-- Intern can update appointment status (for marking sessions as completed)
CREATE POLICY "Intern can update appointment status"
ON appointments FOR UPDATE
USING (
    get_user_role() = 'intern'
)
WITH CHECK (
    get_user_role() = 'intern' AND
    -- Only allow status changes, not other fields
    (OLD.patient_id = NEW.patient_id AND
     OLD.therapist_id = NEW.therapist_id AND
     OLD.date = NEW.date AND
     OLD.start_time = NEW.start_time AND
     OLD.end_time = NEW.end_time AND
     OLD.session_type = NEW.session_type)
);

-- Admin and therapist can delete appointments
CREATE POLICY "Admin and therapist can delete appointments"
ON appointments FOR DELETE
USING (
    get_user_role() IN ('admin', 'therapist')
);

-- PAYMENTS RLS POLICIES

-- Admin and therapist can see all payments
CREATE POLICY "Admin and therapist can view all payments"
ON payments FOR SELECT
USING (
    get_user_role() IN ('admin', 'therapist')
);

-- Patient can see payments for their own appointments
CREATE POLICY "Patient can view own payments"
ON payments FOR SELECT
USING (
    get_user_role() = 'patient' AND
    EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.id = appointment_id
        AND is_patient_owner(a.patient_id)
    )
);

-- Admin and therapist can create payments
CREATE POLICY "Admin and therapist can create payments"
ON payments FOR INSERT
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
);

-- Admin and therapist can update payments
CREATE POLICY "Admin and therapist can update payments"
ON payments FOR UPDATE
USING (
    get_user_role() IN ('admin', 'therapist')
)
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
);

-- Admin and therapist can delete payments
CREATE POLICY "Admin and therapist can delete payments"
ON payments FOR DELETE
USING (
    get_user_role() IN ('admin', 'therapist')
);

-- PATIENT_SESSIONS RLS POLICIES

-- Admin and therapist can see all patient sessions
CREATE POLICY "Admin and therapist can view all patient sessions"
ON patient_sessions FOR SELECT
USING (
    get_user_role() IN ('admin', 'therapist')
);

-- Patient can see their own session packages
CREATE POLICY "Patient can view own session packages"
ON patient_sessions FOR SELECT
USING (
    get_user_role() = 'patient' AND is_patient_owner(patient_id)
);

-- Admin and therapist can create patient sessions (via trigger)
CREATE POLICY "Admin and therapist can create patient sessions"
ON patient_sessions FOR INSERT
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
);

-- Admin and therapist can update patient sessions
CREATE POLICY "Admin and therapist can update patient sessions"
ON patient_sessions FOR UPDATE
USING (
    get_user_role() IN ('admin', 'therapist')
)
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
);

-- Admin and therapist can delete patient sessions
CREATE POLICY "Admin and therapist can delete patient sessions"
ON patient_sessions FOR DELETE
USING (
    get_user_role() IN ('admin', 'therapist')
);

-- Create function to check therapist assignment
CREATE OR REPLACE FUNCTION is_assigned_therapist(appointment_therapist_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN appointment_therapist_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Additional policy for therapists to only see their own appointments (optional, more restrictive)
-- Uncomment if you want therapists to only see appointments assigned to them
/*
CREATE POLICY "Therapist can only view assigned appointments"
ON appointments FOR SELECT
USING (
    get_user_role() = 'therapist' AND is_assigned_therapist(therapist_id)
);
*/

-- Create view for patient appointment summary (accessible to patients)
CREATE OR REPLACE VIEW patient_appointment_summary AS
SELECT 
    a.id,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    a.payment_status,
    a.session_type,
    a.notes,
    u.name as therapist_name
FROM appointments a
JOIN auth.users u ON u.id = a.therapist_id
WHERE is_patient_owner(a.patient_id);

-- Grant access to the view
GRANT SELECT ON patient_appointment_summary TO authenticated;

-- Create view for therapist dashboard
CREATE OR REPLACE VIEW therapist_dashboard AS
SELECT 
    a.id,
    a.patient_id,
    p.name as patient_name,
    p.phone as patient_phone,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    a.payment_status,
    a.session_type,
    a.notes,
    a.created_at,
    a.updated_at
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE get_user_role() IN ('admin', 'therapist', 'intern');

-- Grant access to the view
GRANT SELECT ON therapist_dashboard TO authenticated;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TABLE(
    can_create_appointment BOOLEAN,
    can_edit_appointment BOOLEAN,
    can_delete_appointment BOOLEAN,
    can_view_all_appointments BOOLEAN,
    can_manage_payments BOOLEAN,
    can_access_financial_data BOOLEAN,
    can_mark_session_status BOOLEAN,
    can_access_evolutions BOOLEAN
) AS $$
DECLARE
    user_role TEXT;
BEGIN
    user_role := get_user_role();
    
    RETURN QUERY SELECT
        CASE WHEN user_role IN ('admin', 'therapist') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role IN ('admin', 'therapist') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role IN ('admin', 'therapist') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role IN ('admin', 'therapist', 'intern') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role IN ('admin', 'therapist') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role IN ('admin', 'therapist') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role IN ('admin', 'therapist', 'intern') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role IN ('admin', 'therapist', 'intern') THEN TRUE ELSE FALSE END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_patient_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_assigned_therapist(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_financial_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_appointment_conflict(UUID, DATE, TIME, TIME, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_time_slots(UUID, DATE, INTEGER) TO authenticated;

-- Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    user_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        record_id,
        old_values,
        new_values,
        user_id,
        user_role
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid(),
        get_user_role()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_patient_sessions
    AFTER INSERT OR UPDATE OR DELETE ON patient_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can see all audit logs
CREATE POLICY "Admin can view all audit logs"
ON audit_log FOR SELECT
USING (get_user_role() = 'admin');

-- Add comments for documentation
COMMENT ON FUNCTION get_user_role IS 'Returns the role of the current authenticated user';
COMMENT ON FUNCTION is_patient_owner IS 'Checks if the current user owns the specified patient record';
COMMENT ON FUNCTION is_assigned_therapist IS 'Checks if the current user is the assigned therapist';
COMMENT ON FUNCTION get_user_permissions IS 'Returns permission flags for the current user role';
COMMENT ON VIEW patient_appointment_summary IS 'Patient-accessible view of their own appointments';
COMMENT ON VIEW therapist_dashboard IS 'Therapist dashboard view with patient information';
COMMENT ON TABLE audit_log IS 'Audit trail for sensitive operations on agenda tables';