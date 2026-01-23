-- Migration: Secure user_roles RLS Policy
-- Description: This migration tightens the RLS policy on the user_roles table to prevent non-admin users from viewing all roles.
-- Old policy "user_roles_select_all" was too permissive.
-- New policies:
-- 1. "user_roles_select_own": Allows users to view their own roles.
-- 2. "user_roles_select_admin": Allows admin users to view all roles.
-- Date: 2024-03-15

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;

-- Allow users to view their own roles
CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all roles
CREATE POLICY "user_roles_select_admin" ON public.user_roles
FOR SELECT TO authenticated
USING (
  (get_my_claim('user_role'::text)) = '"admin"'::jsonb
);
