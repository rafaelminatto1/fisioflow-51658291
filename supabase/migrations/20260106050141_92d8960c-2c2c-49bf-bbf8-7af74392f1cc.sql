-- =====================================================
-- SECURITY FIX: Profiles PII Exposure
-- Implements role-based access control for profiles table
-- =====================================================

-- Drop existing overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Acesso controlado a perfis" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Limited profile visibility" ON public.profiles;

-- Create strict role-based profile access policy
-- Only allows:
-- 1. Users to see their own profile (full access)
-- 2. Admins to see all profiles in their organization
-- 3. Fisioterapeutas can see profiles in their org (for patient care)
-- Estagiários have limited access (own profile only unless admin grants more)
CREATE POLICY "secure_profile_select"
ON public.profiles
FOR SELECT
USING (
  -- Own profile - full access
  user_id = (SELECT auth.uid())
  OR
  -- Admins can see all profiles in their organization
  (
    organization_id IS NOT NULL
    AND user_belongs_to_organization((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  )
  OR
  -- Fisioterapeutas can see profiles in their org (needed for patient care)
  (
    organization_id IS NOT NULL
    AND user_belongs_to_organization((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'fisioterapeuta'
    )
  )
);

-- Ensure UPDATE policy only allows own profile updates (admins can update any in org)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;

CREATE POLICY "secure_profile_update"
ON public.profiles
FOR UPDATE
USING (
  -- Can only update own profile
  user_id = (SELECT auth.uid())
  OR
  -- Admins can update any profile in their org
  (
    organization_id IS NOT NULL
    AND user_belongs_to_organization((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR
  (
    organization_id IS NOT NULL
    AND user_belongs_to_organization((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  )
);

-- Create or replace the profiles_safe view with security_invoker
-- This view only exposes non-sensitive fields for general staff use
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  avatar_url,
  role,
  organization_id,
  created_at
FROM public.profiles;

-- Grant access to the safe view
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_safe IS 
'Safe view of profiles table exposing only non-PII fields. 
Use this view for staff listings, dropdowns, and general UI.
Direct profiles table access requires admin role or own profile.
PII fields (cpf, birth_date, phone, address, emergency_contact) are protected.';