-- Migration: Enhanced RBAC with Audit Trail
-- Description: Enhance role-based access control with comprehensive audit logging
-- Date: 2026-01-14

-- ============================================================================
-- ENHANCED USER_ROLES TABLE
-- ============================================================================

-- Add audit columns to user_roles
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS granted_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reason text;

-- Index for efficient role lookups for active roles
CREATE INDEX IF NOT EXISTS idx_user_roles_active_lookup
ON public.user_roles(user_id)
WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now());

-- ============================================================================
-- GRANULAR PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    resource text NOT NULL, -- e.g., 'patients', 'appointments', 'sessions'
    action text NOT NULL, -- e.g., 'read', 'write', 'delete', 'admin'
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default permissions
INSERT INTO public.permissions (name, resource, action, description) VALUES
-- Patient permissions
('patients.read', 'patients', 'read', 'View patient information'),
('patients.write', 'patients', 'write', 'Create and edit patient information'),
('patients.delete', 'patients', 'delete', 'Delete patient records'),
('patients.export', 'patients', 'export', 'Export patient data'),

-- Appointment permissions
('appointments.read', 'appointments', 'read', 'View appointments'),
('appointments.write', 'appointments', 'write', 'Create and edit appointments'),
('appointments.delete', 'appointments', 'delete', 'Delete appointments'),
('appointments.manage_all', 'appointments', 'admin', 'Manage all appointments'),

-- Session permissions
('sessions.read', 'sessions', 'read', 'View session notes'),
('sessions.write', 'sessions', 'write', 'Create and edit session notes'),
('sessions.delete', 'sessions', 'delete', 'Delete session notes'),
('sessions.finalize', 'sessions', 'finalize', 'Finalize draft sessions'),

-- Payment permissions
('payments.read', 'payments', 'read', 'View payment information'),
('payments.write', 'payments', 'write', 'Create and edit payments'),
('payments.manage_all', 'payments', 'admin', 'Manage all payments'),

-- Admin permissions
('users.manage', 'users', 'admin', 'Manage users and roles'),
('roles.assign', 'roles', 'admin', 'Assign and revoke roles'),
('settings.manage', 'settings', 'admin', 'Manage system settings'),
('reports.access', 'reports', 'read', 'Access all reports'),
('audit_logs.read', 'audit_logs', 'read', 'View audit logs'),

-- Exercise permissions
('exercises.read', 'exercises', 'read', 'Ver biblioteca de exercícios'),
('exercises.write', 'exercises', 'write', 'Criar e editar exercícios'),
('exercises.delete', 'exercises', 'delete', 'Excluir exercícios'),
('exercise_videos.read', 'exercise_videos', 'read', 'Ver biblioteca de vídeos'),
('exercise_videos.manage', 'exercise_videos', 'admin', 'Gerenciar biblioteca de vídeos')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROLE PERMISSIONS MAPPING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL,
    permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    granted_at timestamptz DEFAULT now(),
    UNIQUE(role, permission_id)
);

-- Define permissions for each role
-- Admin: All permissions
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 'admin', p.id, (select id from public.profiles where email = 'admin@fisioflow.com' limit 1)
FROM public.permissions p
ON CONFLICT (role, permission_id) DO NOTHING;

-- Fisioterapeuta (Physical Therapist): Can do most things except admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'fisioterapeuta', p.id
FROM public.permissions p
WHERE p.name NOT LIKE '%.admin' 
AND p.name NOT IN ('users.manage', 'roles.assign', 'settings.manage', 'audit_logs.read')
OR p.resource = 'exercise_videos' -- Physiotherapists can manage videos
ON CONFLICT (role, permission_id) DO NOTHING;

-- Estagiario (Intern): Read and limited write access
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'estagiario', p.id
FROM public.permissions p
WHERE p.action IN ('read', 'write')
AND p.resource NOT IN ('users', 'roles', 'settings', 'audit_logs', 'payments.manage_all')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Partner: Limited access
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner', p.id
FROM public.permissions p
WHERE p.resource IN ('appointments', 'patients', 'payments')
AND p.action IN ('read', 'write')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Paciente (Patient): Can only read own data
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'paciente', p.id
FROM public.permissions p
WHERE p.action = 'read'
AND p.resource IN ('patients', 'appointments', 'sessions', 'payments')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================================
-- ENHANCED AUDIT LOGGING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    event_category text NOT NULL, -- 'security', 'clinical', 'admin', 'api', 'system'
    table_name text,
    record_id uuid,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_role text,
    user_email text,
    action text,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    success boolean DEFAULT true,
    error_message text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_user_id ON public.audit_log_enhanced(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_event_type ON public.audit_log_enhanced(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_category ON public.audit_log_enhanced(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_record ON public.audit_log_enhanced(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_date_range ON public.audit_log_enhanced(created_at DESC);

-- Partial index for failed events (security monitoring)
CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_failed
ON public.audit_log_enhanced(event_category, user_id, created_at DESC)
WHERE success = false;

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_enhanced ENABLE ROW LEVEL SECURITY;

-- Permissions table: admins can manage, others can read
DROP POLICY IF EXISTS "permissions_read_all" ON public.permissions;
CREATE POLICY "permissions_read_all" ON public.permissions
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "permissions_manage_admin" ON public.permissions;
CREATE POLICY "permissions_manage_admin" ON public.permissions
FOR ALL TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role = 'admin'
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
);

-- Role permissions: admins can manage, others can read their role's permissions
DROP POLICY IF EXISTS "role_permissions_read_all" ON public.role_permissions;
CREATE POLICY "role_permissions_read_all" ON public.role_permissions
FOR SELECT TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role IN ('admin', 'fisioterapeuta', 'estagiario')
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
);

DROP POLICY IF EXISTS "role_permissions_manage_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_manage_admin" ON public.role_permissions
FOR ALL TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role = 'admin'
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
);

-- Audit log: admins can read, system can insert
DROP POLICY IF EXISTS "audit_log_read_admin" ON public.audit_log_enhanced;
CREATE POLICY "audit_log_read_admin" ON public.audit_log_enhanced
FOR SELECT TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role = 'admin'
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
    AND (
        -- Require MFA for admins to see audit logs
        (current_setting('auth.aal', true) = 'aal2')
    )
);

DROP POLICY IF EXISTS "audit_log_insert_system" ON public.audit_log_enhanced;
CREATE POLICY "audit_log_insert_system" ON public.audit_log_enhanced
FOR INSERT TO authenticated
WITH CHECK (
    -- Allow system inserts via triggers
    (select auth.uid()) IS NOT NULL
);

-- ============================================================================
-- HELPER FUNCTIONS FOR PERMISSION CHECKING
-- ============================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION private.has_permission(permission_name text)
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    -- Get user's primary role
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = (select auth.uid())
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    ORDER BY
        CASE role
            WHEN 'admin' THEN 1
            WHEN 'fisioterapeuta' THEN 2
            WHEN 'estagiario' THEN 3
            WHEN 'partner' THEN 4
            WHEN 'paciente' THEN 5
            ELSE 99
        END
    LIMIT 1;

    -- Check if role has the permission
    RETURN EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role = user_role
        AND p.name = permission_name
    );
END;
$$;

-- Function to check multiple permissions at once
CREATE OR REPLACE FUNCTION private.has_permissions(permission_names text[])
RETURNS TABLE (permission_name text, has_access boolean)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = (select auth.uid())
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    ORDER BY
        CASE role
            WHEN 'admin' THEN 1
            WHEN 'fisioterapeuta' THEN 2
            WHEN 'estagiario' THEN 3
            ELSE 99
        END
    LIMIT 1;

    RETURN QUERY
    SELECT
        unnest(permission_names) as permission_name,
        EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE rp.role = user_role
            AND p.name = unnest(permission_names)
        ) as has_access;
END;
$$;

-- Function to get all permissions for current user
CREATE OR REPLACE FUNCTION private.get_user_permissions()
RETURNS TABLE (permission_name text, resource text, action text)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.name as permission_name,
        p.resource,
        p.action
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE rp.role IN (
        SELECT role FROM public.user_roles
        WHERE user_id = (select auth.uid())
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION private.log_audit_event(
    p_event_type text,
    p_event_category text,
    p_table_name text DEFAULT NULL,
    p_record_id uuid DEFAULT NULL,
    p_action text DEFAULT NULL,
    p_old_values jsonb DEFAULT NULL,
    p_new_values jsonb DEFAULT NULL,
    p_success boolean DEFAULT true,
    p_error_message text DEFAULT NULL,
    p_metadata jsonb DEFAULT NULL
)
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id uuid;
    user_info RECORD;
BEGIN
    -- Get user info
    SELECT
        p.id,
        p.email,
        ur.role
    INTO user_info
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
        AND ur.revoked_at IS NULL
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    WHERE p.id = (select auth.uid())
    LIMIT 1;

    -- Insert audit log
    INSERT INTO public.audit_log_enhanced (
        event_type,
        event_category,
        table_name,
        record_id,
        user_id,
        user_role,
        user_email,
        action,
        old_values,
        new_values,
        ip_address,
        user_agent,
        success,
        error_message,
        metadata
    ) VALUES (
        p_event_type,
        p_event_category,
        p_table_name,
        p_record_id,
        user_info.id,
        user_info.role,
        user_info.email,
        p_action,
        p_old_values,
        p_new_values,
        (current_setting('request.headers', true)::jsonb->>'x-real-ip')::inet,
        current_setting('request.headers', true)::jsonb->>'user-agent',
        p_success,
        p_error_message,
        p_metadata
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC AUDIT LOGGING
-- ============================================================================

-- Generic trigger function for audit logging
CREATE OR REPLACE FUNCTION private.audit_trigger_func()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM private.log_audit_event(
            TG_TABLE_NAME || '_created',
            CASE
                WHEN TG_TABLE_NAME IN ('patients', 'sessions', 'medical_records', 'exercises', 'exercise_videos') THEN 'clinical'
                WHEN TG_TABLE_NAME IN ('users', 'roles', 'user_roles') THEN 'security'
                WHEN TG_TABLE_NAME IN ('payments', 'packages') THEN 'admin'
                ELSE 'api'
            END,
            TG_TABLE_NAME::text,
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW),
            true,
            NULL,
            jsonb_build_object('trigger_name', TG_NAME)
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM private.log_audit_event(
            TG_TABLE_NAME || '_updated',
            CASE
                WHEN TG_TABLE_NAME IN ('patients', 'sessions', 'medical_records') THEN 'clinical'
                WHEN TG_TABLE_NAME IN ('users', 'roles') THEN 'security'
                WHEN TG_TABLE_NAME IN ('payments', 'packages') THEN 'admin'
                ELSE 'api'
            END,
            TG_TABLE_NAME::text,
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            true,
            NULL,
            jsonb_build_object(
                'trigger_name', TG_NAME,
                'changed_fields', (
                    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_value, 'new', new_value))
                    FROM jsonb_each_text(to_jsonb(OLD))
                    JOIN jsonb_each_text(to_jsonb(NEW)) USING (key)
                    WHERE old_value IS DISTINCT FROM new_value
                )
            )
        );
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        PERFORM private.log_audit_event(
            TG_TABLE_NAME || '_deleted',
            CASE
                WHEN TG_TABLE_NAME IN ('patients', 'sessions', 'medical_records') THEN 'clinical'
                WHEN TG_TABLE_NAME IN ('users', 'roles') THEN 'security'
                WHEN TG_TABLE_NAME IN ('payments', 'packages') THEN 'admin'
                ELSE 'api'
            END,
            TG_TABLE_NAME::text,
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL,
            true,
            NULL,
            jsonb_build_object('trigger_name', TG_NAME)
        );
        RETURN OLD;
    END IF;
END;
$$;

-- ============================================================================
-- APPLY AUDIT TRIGGERS TO KEY TABLES
-- ============================================================================

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS patients_audit_trigger ON public.patients;
DROP TRIGGER IF EXISTS appointments_audit_trigger ON public.appointments;
DROP TRIGGER IF EXISTS sessions_audit_trigger ON public.sessions;
DROP TRIGGER IF EXISTS user_roles_audit_trigger ON public.user_roles;

-- Apply new triggers
CREATE TRIGGER patients_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

CREATE TRIGGER appointments_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

CREATE TRIGGER sessions_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

CREATE TRIGGER user_roles_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

CREATE TRIGGER exercises_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

CREATE TRIGGER exercise_videos_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.exercise_videos
FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

-- ============================================================================
-- MFA ENFORCEMENT FOR ADMINS
-- ============================================================================

-- Function to check if MFA is required for a user
CREATE OR REPLACE FUNCTION private.mfa_required_for_user(user_uuid uuid)
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- MFA is required for admins
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid
        AND role = 'admin'
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$;

-- Function to verify user MFA status
CREATE OR REPLACE FUNCTION private.verify_user_mfa(user_uuid uuid)
RETURNS TABLE (
    has_mfa boolean,
    mfa_enabled boolean,
    mfa_factors_count int
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = user_uuid) as has_mfa,
        EXISTS (
            SELECT 1 FROM auth.mfa_factors
            WHERE user_id = user_uuid
            AND status = 'verified'
        ) as mfa_enabled,
        (SELECT COUNT(*) FROM auth.mfa_factors WHERE user_id = user_uuid) as mfa_factors_count;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION private.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_permissions(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION private.mfa_required_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.verify_user_mfa(uuid) TO authenticated;

-- Grant select on permissions and role_permissions for read access
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for user permissions
CREATE OR REPLACE VIEW private.user_permission_view AS
SELECT
    u.id as user_id,
    u.email,
    ur.role,
    ur.expires_at,
    p.name as permission_name,
    p.resource,
    p.action
FROM public.profiles u
JOIN public.user_roles ur ON ur.user_id = u.id
    AND ur.revoked_at IS NULL
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
JOIN public.role_permissions rp ON rp.role = ur.role::text
JOIN public.permissions p ON p.id = rp.permission_id;

GRANT SELECT ON private.user_permission_view TO authenticated;

-- View for audit log summary
CREATE OR REPLACE VIEW private.audit_log_summary AS
SELECT
    date_trunc('day', created_at) as day,
    event_category,
    user_role,
    COUNT(*) as event_count,
    COUNT(*) FILTER (WHERE NOT success) as failed_count,
    jsonb_agg(DISTINCT user_email) as unique_users
FROM public.audit_log_enhanced
WHERE created_at >= now() - interval '30 days'
GROUP BY date_trunc('day', created_at), event_category, user_role
ORDER BY day DESC;

GRANT SELECT ON private.audit_log_summary TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.permissions IS 'Granular permissions for role-based access control';
COMMENT ON TABLE public.role_permissions IS 'Maps roles to permissions for RBAC';
COMMENT ON TABLE public.audit_log_enhanced IS 'Enhanced audit logging with detailed event tracking';
COMMENT ON TABLE public.user_roles IS 'User roles with expiration and revocation support for enhanced security';
COMMENT ON FUNCTION private.has_permission(text) IS 'Check if current user has a specific permission. Uses role-based lookup.';
COMMENT ON FUNCTION private.get_user_permissions() IS 'Get all permissions for the current user based on their roles.';
COMMENT ON FUNCTION private.mfa_required_for_user(uuid) IS 'Check if MFA is required for a given user (required for admins).';
COMMENT ON VIEW private.user_permission_view IS 'Denormalized view of user permissions for efficient querying';
COMMENT ON VIEW private.audit_log_summary IS 'Daily summary of audit events by category and role';
