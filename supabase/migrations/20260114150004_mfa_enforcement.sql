-- Migration: MFA Enforcement for Admin Users
-- Description: Enforce MFA for all admin users with recovery codes and audit logging
-- Date: 2026-01-14

-- ============================================================================
-- MFA ENFORCEMENT FOR ADMIN USERS
-- ============================================================================

-- Create private schema if not exists
CREATE SCHEMA IF NOT EXISTS private;

-- Function to enforce MFA requirement during login
CREATE OR REPLACE FUNCTION private.enforce_mfa_for_admins()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_has_mfa boolean;
    user_is_admin boolean;
BEGIN
    -- Check if user has verified MFA factors
    SELECT EXISTS(
        SELECT 1 FROM auth.mfa_factors
        WHERE user_id = NEW.user_id
        AND status = 'verified'
    ) INTO user_has_mfa;

    -- Check if user is admin
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles
        WHERE user_id = NEW.user_id
        AND role = 'admin'
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO user_is_admin;

    -- If admin without MFA, log security event
    IF user_is_admin AND NOT user_has_mfa THEN
        INSERT INTO public.audit_log_enhanced (
            event_type,
            event_category,
            user_id,
            user_role,
            action,
            success,
            error_message,
            metadata
        ) VALUES (
            'admin_login_without_mfa',
            'security',
            NEW.user_id,
            'admin',
            'login_attempt',
            true,
            'Admin user logged in without MFA',
            jsonb_build_object(
                'mfa_required', true,
                'mfa_enforced', false,
                'timestamp', now()
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Function to check if user has MFA enabled
CREATE OR REPLACE FUNCTION private.check_user_mfa_status(user_uuid uuid)
RETURNS TABLE (
    has_mfa boolean,
    mfa_enabled boolean,
    mfa_verified boolean,
    factors_count int,
    is_admin boolean,
    mfa_required boolean
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id = user_uuid) as has_mfa,
        EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id = user_uuid AND status = 'verified') as mfa_enabled,
        EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id = user_uuid AND status = 'verified') as mfa_verified,
        (SELECT COUNT(*) FROM auth.mfa_factors WHERE user_id = user_uuid) as factors_count,
        EXISTS(
            SELECT 1 FROM public.user_roles
            WHERE user_id = user_uuid
            AND role = 'admin'
            AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > now())
        ) as is_admin,
        -- MFA is required for admins
        EXISTS(
            SELECT 1 FROM public.user_roles
            WHERE user_id = user_uuid
            AND role = 'admin'
            AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > now())
        ) as mfa_required;
END;
$$;

-- Function to require MFA before granting admin access
CREATE OR REPLACE FUNCTION private.require_mfa_for_admin_access()
RETURNS boolean
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    mfa_status RECORD;
BEGIN
    current_user_id := (select auth.uid());

    -- Get MFA status
    SELECT * INTO mfa_status
    FROM private.check_user_mfa_status(current_user_id)
    LIMIT 1;

    -- If MFA is required but not enabled, raise exception
    IF mfa_status.mfa_required AND NOT mfa_status.mfa_verified THEN
        RAISE EXCEPTION 'MFA is required for admin users. Please enable two-factor authentication.';
    END IF;

    RETURN true;
END;
$$;

-- ============================================================================
-- MFA RECOVERY CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT now() + interval '1 year'
);

-- Index for recovery code lookups (commented out - now() is not immutable)
-- CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id
-- ON public.mfa_recovery_codes(user_id, used)
-- WHERE used = false AND expires_at > now();

-- RLS for recovery codes
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_recovery_codes_select_own" ON public.mfa_recovery_codes;
CREATE POLICY "mfa_recovery_codes_select_own" ON public.mfa_recovery_codes
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "mfa_recovery_codes_insert_system" ON public.mfa_recovery_codes;
CREATE POLICY "mfa_recovery_codes_insert_system" ON public.mfa_recovery_codes
FOR INSERT TO authenticated
WITH CHECK (false); -- Only system/triggers can insert

-- ============================================================================
-- MFA AUDIT LOGGING
-- ============================================================================

-- Table to track MFA events
CREATE TABLE IF NOT EXISTS public.mfa_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'enabled', 'disabled', 'verified', 'failed', 'recovery_used'
    factor_type TEXT, -- 'totp', 'sms', 'email', 'recovery_code'
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB
);

-- Indexes for MFA audit queries
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user_id
ON public.mfa_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_event_type
ON public.mfa_audit_log(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_failed
ON public.mfa_audit_log(user_id, created_at DESC)
WHERE success = false;

-- RLS for MFA audit log
ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_audit_log_select_own" ON public.mfa_audit_log;
CREATE POLICY "mfa_audit_log_select_own" ON public.mfa_audit_log
FOR SELECT TO authenticated
USING (
    (select auth.uid()) = user_id OR
    (select auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role = 'admin'
        AND revoked_at IS NULL
    )
);

DROP POLICY IF EXISTS "mfa_audit_log_insert_system" ON public.mfa_audit_log;
CREATE POLICY "mfa_audit_log_insert_system" ON public.mfa_audit_log
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- MFA HELPER FUNCTIONS
-- ============================================================================

-- Function to log MFA events
CREATE OR REPLACE FUNCTION private.log_mfa_event(
    p_event_type TEXT,
    p_factor_type TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.mfa_audit_log (
        user_id,
        event_type,
        factor_type,
        success,
        error_message,
        metadata
    ) VALUES (
        (select auth.uid()),
        p_event_type,
        p_factor_type,
        p_success,
        p_error_message,
        p_metadata
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$;

-- Function to check if admin has MFA enabled (for frontend validation)
CREATE OR REPLACE FUNCTION private.admin_has_mfa_enabled()
RETURNS boolean
SET search_path = ''
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.user_roles ur
        JOIN auth.mfa_factors mfa ON ur.user_id = mfa.user_id
        WHERE ur.user_id = (select auth.uid())
        AND ur.role = 'admin'
        AND ur.revoked_at IS NULL
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
        AND mfa.status = 'verified'
    );
END;
$$;

-- Function to get users without MFA (for admin monitoring)
CREATE OR REPLACE FUNCTION private.get_admins_without_mfa()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    is_admin BOOLEAN
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id as user_id,
        u.email,
        u.created_at,
        EXISTS(
            SELECT 1 FROM public.user_roles
            WHERE user_id = u.id
            AND role = 'admin'
            AND revoked_at IS NULL
        ) as is_admin
    FROM auth.users u
    WHERE u.id IN (
        SELECT user_id FROM public.user_roles
        WHERE role = 'admin'
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
    AND NOT EXISTS(
        SELECT 1 FROM auth.mfa_factors
        WHERE user_id = u.id
        AND status = 'verified'
    );
END;
$$;

-- ============================================================================
-- VIEW FOR MFA STATUS DASHBOARD
-- ============================================================================

CREATE OR REPLACE VIEW private.mfa_status_dashboard AS
SELECT
    u.id as user_id,
    u.email,
    ur.role,
    COUNT(mfa.id) FILTER (WHERE mfa.status = 'verified') as mfa_factors_enabled,
    COUNT(mfa.id) as total_mfa_factors,
    MAX(mfa.created_at) as mfa_enabled_at,
    COUNT(DISTINCT mal.id) as mfa_events,
    COUNT(DISTINCT mal.id) FILTER (WHERE mal.success = false) as failed_mfa_attempts,
    CASE
        WHEN ur.role = 'admin' AND COUNT(mfa.id) FILTER (WHERE mfa.status = 'verified') = 0 THEN 'mfa_required'
        WHEN COUNT(mfa.id) FILTER (WHERE mfa.status = 'verified') > 0 THEN 'mfa_enabled'
        ELSE 'no_mfa'
    END as mfa_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
    AND ur.revoked_at IS NULL
LEFT JOIN auth.mfa_factors mfa ON mfa.user_id = u.id
LEFT JOIN public.mfa_audit_log mal ON mal.user_id = u.id
    AND mal.created_at >= now() - interval '30 days'
WHERE ur.role IN ('admin', 'fisioterapeuta', 'estagiario', 'partner')
GROUP BY u.id, u.email, ur.role
ORDER BY ur.role, u.email;

GRANT SELECT ON private.mfa_status_dashboard TO authenticated;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.check_user_mfa_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.require_mfa_for_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_has_mfa_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_admins_without_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION private.log_mfa_event(text, text, boolean, text, jsonb) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.mfa_recovery_codes IS 'Recovery codes for MFA backup access';
COMMENT ON TABLE public.mfa_audit_log IS 'Audit log for MFA events and activities';
COMMENT ON FUNCTION private.check_user_mfa_status(uuid) IS 'Check MFA status and requirements for a user';
COMMENT ON FUNCTION private.require_mfa_for_admin_access() IS 'Enforce MFA requirement before granting admin access';
COMMENT ON FUNCTION private.admin_has_mfa_enabled() IS 'Check if current admin user has MFA enabled';
COMMENT ON FUNCTION private.get_admins_without_mfa() IS 'Get list of admin users without MFA (for security monitoring)';
COMMENT ON VIEW private.mfa_status_dashboard IS 'Dashboard view showing MFA status for all privileged users';
