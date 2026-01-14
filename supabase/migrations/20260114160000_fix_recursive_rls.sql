-- Migration: Fix Recursive RLS Policies
-- Description: Fix infinite recursion in RLS policies by using a security definer function
-- Date: 2026-01-14

-- ============================================================================
-- SECURITY DEFINER FUNCTION TO BYPASS RLS
-- ============================================================================

-- Create a secure function to check admin status without triggering RLS recursion
-- This function runs with the privileges of the creator (postgres/admin)
CREATE OR REPLACE FUNCTION private.is_admin_secure()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Direct query to user_roles, bypassing RLS because of SECURITY DEFINER
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (select auth.uid())
        AND role = 'admin'
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$;

COMMENT ON FUNCTION private.is_admin_secure IS 'Securely check if current user is admin without triggering recursive RLS.';

GRANT EXECUTE ON FUNCTION private.is_admin_secure TO authenticated;

-- ============================================================================
-- UPDATE USER_ROLES POLICIES
-- ============================================================================

-- Drop existing recursive policies
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;

-- Create new non-recursive policies
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
FOR SELECT TO authenticated
USING (
    user_id = (select auth.uid()) OR
    private.is_admin_secure()
);

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
FOR ALL TO authenticated
USING (
    private.is_admin_secure()
)
WITH CHECK (
    private.is_admin_secure()
);

-- ============================================================================
-- UPDATE OTHER AFFECTED POLICIES
-- ============================================================================

-- Update other policies that might be recursive usage of user_roles if needed
-- The previous migration added robust policies, but using the function is more efficient
-- and safer than repeated subqueries. For now, we focus on user_roles which is the source.
