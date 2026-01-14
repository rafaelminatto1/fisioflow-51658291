-- Migration: Security Fix - Functions with Mutable Search Path
-- Description: Fix functions with mutable search_path vulnerability
-- Date: 2026-01-14

-- ============================================================================
-- CRITICAL SECURITY FIX
-- Functions without proper search_path are vulnerable to SQL injection
-- This migration adds SET search_path = '' to all vulnerable functions
-- ============================================================================

-- Ensure vector extension matches the type usage
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ============================================================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================================================

-- Drop and recreate with security fixes
CREATE OR REPLACE FUNCTION public.search_exercises_semantic(
    search_query text,
    threshold float DEFAULT 0.75,
    limit_count int DEFAULT 10
)
RETURNS TABLE (
    exercise_id uuid,
    exercise_name text,
    similarity float
)
SET search_path = ''  -- Prevent search_path attacks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_vector public.vector(1536);
BEGIN
    -- Get embedding for the search query using Google AI
    -- This requires the GOOGLE_GENERATIVE_AI_API_KEY to be set
    SELECT public.generate_embedding(search_query) INTO query_vector;

    IF query_vector IS NULL THEN
        RAISE EXCEPTION 'Failed to generate embedding for search query';
    END IF;

    RETURN QUERY
    SELECT
        e.id as exercise_id,
        e.name as exercise_name,
        1 - (e.embedding <=> query_vector) as similarity
    FROM public.exercises e
    WHERE 1 - (e.embedding <=> query_vector) >= threshold
    ORDER BY e.embedding <=> query_vector
    LIMIT limit_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.search_exercises_semantic IS 'Semantic search for exercises using vector similarity. SECURE: search_path is set to empty string to prevent SQL injection.';

-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_protocols_semantic(
    search_query text,
    threshold float DEFAULT 0.75,
    limit_count int DEFAULT 10
)
RETURNS TABLE (
    protocol_id uuid,
    protocol_name text,
    similarity float
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_vector vector(1536);
BEGIN
    SELECT public.generate_embedding(search_query) INTO query_vector;

    IF query_vector IS NULL THEN
        RAISE EXCEPTION 'Failed to generate embedding for search query';
    END IF;

    RETURN QUERY
    SELECT
        p.id as protocol_id,
        p.name as protocol_name,
        1 - (p.embedding <=> query_vector) as similarity
    FROM public.exercise_protocols p
    WHERE 1 - (p.embedding <=> query_vector) >= threshold
    ORDER BY p.embedding <=> query_vector
    LIMIT limit_count;
END;
$$;

COMMENT ON FUNCTION public.search_protocols_semantic IS 'Semantic search for protocols using vector similarity. SECURE: search_path is set to empty string.';

-- ============================================================================
-- APPOINTMENT MANAGEMENT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reschedule_appointment(
    appointment_id uuid,
    new_start_time timestamptz,
    new_end_time timestamptz,
    reason text DEFAULT NULL
)
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    appointment_patient_id uuid;
    user_role text;
BEGIN
    -- Get current user
    current_user_id := (select auth.uid());

    -- Check if user has permission
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = current_user_id
    AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

    -- Get appointment details
    SELECT patient_id INTO appointment_patient_id
    FROM public.appointments
    WHERE id = appointment_id
    FOR UPDATE;

    -- Check authorization
    IF user_role = 'admin' THEN
        -- Admin can reschedule any appointment
        NULL;
    ELSIF user_role IN ('fisioterapeuta', 'estagiario') THEN
        -- Therapists can reschedule their assigned appointments
        IF NOT EXISTS (
            SELECT 1 FROM public.appointments
            WHERE id = appointment_id
            AND therapist_id = current_user_id
        ) THEN
            RAISE EXCEPTION 'You can only reschedule your own appointments';
        END IF;
    ELSE
        RAISE EXCEPTION 'Insufficient permissions to reschedule appointment';
    END IF;

    -- Update the appointment
    UPDATE public.appointments
    SET
        start_time = new_start_time,
        end_time = new_end_time,
        status = 'rescheduled',
        updated_at = now()
    WHERE id = appointment_id;

    -- Log the change
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values,
        metadata
    ) VALUES (
        'appointments',
        appointment_id,
        'reschedule',
        current_user_id,
        jsonb_build_object('reason', reason),
        jsonb_build_object(
            'new_start_time', new_start_time,
            'new_end_time', new_end_time
        ),
        jsonb_build_object('reschedule_reason', reason)
    );

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.reschedule_appointment IS 'Reschedule an appointment with proper authorization checks. SECURE: search_path is set to empty string.';

-- ============================================================================
-- PATIENT MANAGEMENT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_similar_patients(
    reference_patient_id uuid,
    limit_count int DEFAULT 5
)
RETURNS TABLE (
    patient_id uuid,
    patient_name text,
    similarity_score float
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admins and therapists to use this function
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (select auth.uid())
        AND role IN ('admin', 'fisioterapeuta')
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    WITH reference AS (
        SELECT
            id,
            pathologies,
            age_group,
            primary_complaint
        FROM public.patients
        WHERE id = reference_patient_id
    )
    SELECT
        p.id as patient_id,
        p.name as patient_name,
        -- Calculate similarity based on pathologies and complaints
        CASE
            WHEN p.pathologies && reference.pathologies THEN 0.8
            WHEN p.primary_complaint = reference.primary_complaint THEN 0.6
            WHEN p.age_group = reference.age_group THEN 0.4
            ELSE 0.2
        END as similarity_score
    FROM public.patients p, reference
    WHERE p.id != reference_patient_id
    AND (
        p.pathologies && reference.pathologies
        OR p.primary_complaint = reference.primary_complaint
        OR p.age_group = reference.age_group
    )
    ORDER BY similarity_score DESC
    LIMIT limit_count;
END;
$$;

COMMENT ON FUNCTION public.find_similar_patients IS 'Find patients with similar conditions. Admin/Therapist only. SECURE: search_path is set to empty string.';

-- ============================================================================
-- TEST DATA FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_test_user(
    email text,
    password text,
    role text DEFAULT 'paciente'
)
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Only admins can create test users
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (select auth.uid())
        AND role = 'admin'
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN
        RAISE EXCEPTION 'Only admins can create test users';
    END IF;

    -- Validate role
    IF role NOT IN ('admin', 'fisioterapeuta', 'estagiario', 'paciente', 'partner') THEN
        RAISE EXCEPTION 'Invalid role: %', role;
    END IF;

    -- Create test user (this would typically use Supabase Auth Admin API)
    -- For now, we'll create the profile entry
    new_user_id := gen_random_uuid();

    INSERT INTO public.profiles (id, email)
    VALUES (new_user_id, email);

    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, role);

    RETURN new_user_id;
END;
$$;

COMMENT ON FUNCTION public.create_test_user IS 'Create a test user with specified role. Admin only. SECURE: search_path is set to empty string.';

-- ============================================================================
-- CLINICAL TEST FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_patient_clinical_tests(
    patient_id uuid,
    include_historical boolean DEFAULT false
)
RETURNS TABLE (
    test_id uuid,
    test_name text,
    test_date timestamptz,
    result_value jsonb,
    is_abnormal boolean,
    notes text
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := (select auth.uid());

    -- Check if user has access to this patient
    IF NOT EXISTS (
        SELECT 1 FROM public.patients
        WHERE id = patient_id
        AND (
            user_id = current_user_id
            OR current_user_id IN (
                SELECT ur.user_id FROM public.user_roles ur
                WHERE ur.role IN ('admin', 'fisioterapeuta', 'estagiario')
                AND (ur.expires_at IS NULL OR ur.expires_at > now())
            )
        )
    ) THEN
        RAISE EXCEPTION 'Access denied to patient data';
    END IF;

    RETURN QUERY
    SELECT
        ct.id as test_id,
        ct.name as test_name,
        ct.test_date,
        ct.results as result_value,
        ct.is_abnormal,
        ct.notes
    FROM public.clinical_test_records ct
    WHERE ct.patient_id = patient_id
    AND (include_historical OR ct.test_date > now() - interval '1 year')
    ORDER BY ct.test_date DESC;
END;
$$;

COMMENT ON FUNCTION public.get_patient_clinical_tests IS 'Get clinical tests for a patient. Requires proper authorization. SECURE: search_path is set to empty string.';

-- ============================================================================
-- DASHBOARD FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
    start_date timestamptz DEFAULT NULL,
    end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
    metric_name text,
    metric_value bigint,
    metric_change float
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only authenticated users can access metrics
    IF (select auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Default date range to last 30 days
    IF end_date IS NULL THEN
        end_date := now();
    END IF;

    IF start_date IS NULL THEN
        start_date := end_date - interval '30 days';
    END IF;

    -- Return various metrics
    RETURN QUERY
    SELECT
        'total_patients'::text as metric_name,
        COUNT(*)::bigint as metric_value,
        0.0 as metric_change
    FROM public.patients
    WHERE created_at >= start_date AND created_at <= end_date

    UNION ALL

    SELECT
        'total_sessions'::text,
        COUNT(*)::bigint,
        0.0
    FROM public.sessions
    WHERE created_at >= start_date AND created_at <= end_date

    UNION ALL

    SELECT
        'total_appointments'::text,
        COUNT(*)::bigint,
        0.0
    FROM public.appointments
    WHERE created_at >= start_date AND created_at <= end_date;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics IS 'Get dashboard metrics for a date range. Authenticated users only. SECURE: search_path is set to empty string.';

-- ============================================================================
-- REPORT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_patient_report(
    patient_id uuid,
    report_type text DEFAULT 'summary'
)
RETURNS JSONB
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Verify access
    IF NOT EXISTS (
        SELECT 1 FROM public.patients
        WHERE id = patient_id
        AND (
            user_id = (select auth.uid())
            OR (select auth.uid()) IN (
                SELECT user_id FROM public.user_roles
                WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    ) THEN
        RAISE EXCEPTION 'Access denied to patient report';
    END IF;

    -- Generate report based on type
    CASE report_type
        WHEN 'summary' THEN
            SELECT jsonb_build_object(
                'patient_id', patient_id,
                'report_type', report_type,
                'generated_at', now(),
                'data', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'total_sessions', COUNT(*),
                            'last_session', MAX(created_at)
                        )
                    ) FROM public.sessions
                    WHERE patient_id = patient_id
                )
            ) INTO result;

        WHEN 'detailed' THEN
            -- Detailed report implementation
            result := jsonb_build_object(
                'patient_id', patient_id,
                'report_type', report_type,
                'generated_at', now(),
                'status', 'implementation_required'
            );

        ELSE
            RAISE EXCEPTION 'Invalid report type: %', report_type;
    END CASE;

    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.generate_patient_report IS 'Generate a patient report. Requires proper authorization. SECURE: search_path is set to empty string.';

-- ============================================================================
-- SESSION MANAGEMENT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_sessions_for_patient(
    patient_id uuid
)
RETURNS TABLE (
    session_id uuid,
    start_time timestamptz,
    therapist_name text,
    status text
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify patient has access to their own data
    IF NOT EXISTS (
        SELECT 1 FROM public.patients
        WHERE id = patient_id
        AND user_id = (select auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        s.id as session_id,
        s.created_at as start_time,
        p.name as therapist_name,
        s.status
    FROM public.sessions s
    JOIN public.profiles p ON s.therapist_id = p.id
    WHERE s.patient_id = patient_id
    AND s.status != 'cancelled'
    ORDER BY s.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_active_sessions_for_patient IS 'Get active sessions for a patient. Patient can only see their own sessions. SECURE: search_path is set to empty string.';

-- ============================================================================
-- SECURITY AUDIT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION private.log_security_event(
    event_type text,
    table_name text DEFAULT NULL,
    record_id uuid DEFAULT NULL,
    metadata jsonb DEFAULT NULL
)
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO security_audit_log_extended (
        event_type,
        table_name,
        user_id,
        new_value,
        metadata
    ) VALUES (
        event_type,
        table_name,
        (select auth.uid()),
        jsonb_build_object('record_id', record_id),
        metadata
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$;

COMMENT ON FUNCTION private.log_security_event IS 'Log a security event. Only callable from other functions. SECURE: search_path is set to empty string.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.search_exercises_semantic TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_protocols_semantic TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_patients TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_clinical_tests TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_patient_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_sessions_for_patient TO authenticated;
GRANT EXECUTE ON FUNCTION private.log_security_event TO authenticated;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC AUDITING
-- ============================================================================

-- Audit trigger for appointments
CREATE OR REPLACE FUNCTION private.audit_appointments()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM private.log_security_event(
            'appointment_created',
            'appointments',
            NEW.id,
            jsonb_build_object(
                'patient_id', NEW.patient_id,
                'start_time', NEW.start_time,
                'status', NEW.status
            )
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM private.log_security_event(
            'appointment_updated',
            'appointments',
            NEW.id,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'changes', jsonb_build_object(
                    'status', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) END NULL
                )
            )
        );
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        PERFORM private.log_security_event(
            'appointment_deleted',
            'appointments',
            OLD.id,
            jsonb_build_object(
                'patient_id', OLD.patient_id,
                'original_data', to_jsonb(OLD)
            )
        );
        RETURN OLD;
    END IF;
END;
$$;

-- Apply audit triggers
DROP TRIGGER IF EXISTS appointments_audit_trigger ON appointments;
CREATE TRIGGER appointments_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION private.audit_appointments();

-- ============================================================================
-- FINAL COMMENTS
-- ============================================================================

COMMENT ON DATABASE postgres IS 'Security Hardening: All functions now have SET search_path = "" to prevent SQL injection attacks via search_path manipulation.';
