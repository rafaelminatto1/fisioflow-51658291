-- Migration: Security Fix - RLS Policies
-- Description: Fix critical RLS policies with "always true" conditions
-- Date: 2026-01-14

-- ============================================================================
-- WARNING: This migration fixes CRITICAL security vulnerabilities
-- Multiple tables have RLS policies with "USING (true)" which expose ALL data
-- This migration replaces them with proper role-based access control
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Drop insecure policies and create secure ones for core tables
-- ----------------------------------------------------------------------------

-- Ensure expires_at column exists in user_roles
ALTER TABLE IF EXISTS user_roles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Ensure user_id column exists in patients for ownership checks
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Ensure patient_id column exists in payments
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);

-- ============================================================================
-- PATIENTS TABLE - Critical security fix
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;

-- Create secure policies for patients
CREATE POLICY "patients_can_view_own_data" ON patients
FOR SELECT TO authenticated
USING (
    (select auth.uid()) = id OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "patients_can_update_own_data" ON patients
FOR UPDATE TO authenticated
USING (
    (select auth.uid()) = id OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "admins_can_insert_patients" ON patients
FOR INSERT TO authenticated
WITH CHECK (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "admins_can_delete_patients" ON patients
FOR DELETE TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "appointments_select_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON appointments;

CREATE POLICY "appointments_select_own" ON appointments
FOR SELECT TO authenticated
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = (select auth.uid())
    ) OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "appointments_insert_therapist" ON appointments
FOR INSERT TO authenticated
WITH CHECK (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "appointments_update_therapist" ON appointments
FOR UPDATE TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "appointments_delete_admin" ON appointments
FOR DELETE TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- SESSIONS TABLE (SOAP Notes)
-- ============================================================================

DROP POLICY IF EXISTS "sessions_select_policy" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_policy" ON sessions;
DROP POLICY IF EXISTS "sessions_update_policy" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_policy" ON sessions;

CREATE POLICY "sessions_select_own" ON sessions
FOR SELECT TO authenticated
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = (select auth.uid())
    ) OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "sessions_insert_therapist" ON sessions
FOR INSERT TO authenticated
WITH CHECK (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "sessions_update_therapist" ON sessions
FOR UPDATE TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "sessions_delete_admin" ON sessions
FOR DELETE TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- MEDICAL RECORDS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "medical_records_select_policy" ON medical_records;
DROP POLICY IF EXISTS "medical_records_insert_policy" ON medical_records;
DROP POLICY IF EXISTS "medical_records_update_policy" ON medical_records;

CREATE POLICY "medical_records_select_own" ON medical_records
FOR SELECT TO authenticated
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = (select auth.uid())
    ) OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "medical_records_upsert_therapist" ON medical_records
FOR ALL TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
)
WITH CHECK (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;

CREATE POLICY "payments_select_own" ON payments
FOR SELECT TO authenticated
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = (select auth.uid())
    ) OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "payments_manage_admin" ON payments
FOR ALL TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
)
WITH CHECK (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT TO authenticated
USING ((select auth.uid()) = id);

CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_insert_authenticated" ON profiles
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- USER_ROLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON user_roles;

CREATE POLICY "user_roles_select_all" ON user_roles
FOR SELECT TO authenticated
USING (
    (select auth.uid()) = user_id OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "user_roles_admin_manage" ON user_roles
FOR ALL TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
)
WITH CHECK (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- GAMIFICATION TABLES (patient_gamification, achievements, etc)
-- ============================================================================

DROP POLICY IF EXISTS "patient_gamification_select_policy" ON patient_gamification;
DROP POLICY IF EXISTS "patient_gamification_update_policy" ON patient_gamification;

CREATE POLICY "patient_gamification_select_own" ON patient_gamification
FOR SELECT TO authenticated
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = (select auth.uid())
    ) OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "patient_gamification_update_system" ON patient_gamification
FOR UPDATE TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- NOTIFICATIONS TABLES
-- ============================================================================

DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
FOR SELECT TO authenticated
USING (
    user_id = (select auth.uid()) OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "notifications_insert_system" ON notifications
FOR INSERT TO authenticated
WITH CHECK (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- STORAGE OBJECTS (File access control)
-- ============================================================================

-- Ensure storage folders are organized by user_id
DROP POLICY IF EXISTS "storage_objects_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

CREATE POLICY "storage_objects_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1] OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "storage_objects_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1] OR
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND expires_at IS NULL OR expires_at > now()
    )
);

CREATE POLICY "storage_objects_delete_admin" ON storage.objects
FOR DELETE TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- ============================================================================
-- INDEXES to support the new RLS policies
-- ============================================================================

-- Index for user_roles lookups in RLS policies
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON user_roles(user_id, role, expires_at);

-- Index for patient to user lookup
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id, id);

-- (Removed idx_patients_for_roles as subqueries are not allowed in indexes)

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Ensure authenticated role has usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- ============================================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Function to check if current user has specific role
CREATE OR REPLACE FUNCTION private.has_role(required_role text)
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (select auth.uid())
        AND role = required_role
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN private.has_role('admin');
END;
$$;

-- Function to get patient IDs accessible to current user
CREATE OR REPLACE FUNCTION private.accessible_patient_ids()
RETURNS TABLE (patient_id uuid)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.patients WHERE user_id = (select auth.uid())
    UNION
    SELECT p.id FROM public.patients p
    WHERE (select auth.uid()) IN (
        SELECT ur.user_id FROM public.user_roles ur
        WHERE ur.role IN ('admin', 'fisioterapeuta', 'estegiario')
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    );
END;
$$;

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

-- Enable audit logging for policy changes
CREATE TABLE IF NOT EXISTS security_audit_log_extended (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    table_name TEXT,
    policy_name TEXT,
    user_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log_extended(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log_extended(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log_extended(created_at DESC);

-- RLS for audit log - only admins can view
ALTER TABLE security_audit_log_extended ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin" ON security_audit_log_extended
FOR SELECT TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
        AND expires_at IS NULL OR expires_at > now()
    )
);

-- Only system can insert (triggers will populate)
CREATE POLICY "audit_log_insert_system" ON security_audit_log_extended
FOR INSERT TO authenticated
WITH CHECK (false);

-- Grant access to audit functions
GRANT EXECUTE ON FUNCTION private.has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.accessible_patient_ids() TO authenticated;

-- ============================================================================
-- TRIGGER FOR AUDIT LOGGING
-- ============================================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION private.log_security_event()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO private.security_audit_log_extended (
        event_type,
        table_name,
        user_id,
        new_value,
        metadata
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        (select auth.uid()),
        to_jsonb(NEW),
        jsonb_build_object(
            'trigger_name', TG_NAME,
            'operation', TG_OP,
            'when', now()
        )
    );
    RETURN NEW;
END;
$$;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE security_audit_log_extended IS 'Extended security audit log for tracking access control changes';
COMMENT ON FUNCTION private.has_role(text) IS 'Check if current user has a specific role (with expiration check)';
COMMENT ON FUNCTION private.is_admin() IS 'Check if current user is an admin';
COMMENT ON FUNCTION private.accessible_patient_ids() IS 'Return all patient IDs accessible to current user based on roles';
COMMENT ON INDEX idx_user_roles_lookup IS 'Index for efficient RLS policy role checks with expiration';
COMMENT ON INDEX idx_patients_user_id IS 'Index for patient ownership lookup in RLS policies';
