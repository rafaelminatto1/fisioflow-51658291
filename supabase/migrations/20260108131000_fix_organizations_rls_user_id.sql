-- Fix organizations RLS policy that incorrectly uses profiles.id instead of profiles.user_id
-- This is causing 406 errors when querying organizations and creating circular dependencies

-- 1. Break recursion by allowing users to view their own organization membership directly
DROP POLICY IF EXISTS "view_own_membership" ON public.organization_members;
CREATE POLICY "view_own_membership"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Drop the incorrect policy on organizations
DROP POLICY IF EXISTS "organizations_member_select" ON public.organizations;

-- 3. Recreate with correct dependency using organization_members instead of profiles
-- This avoids the profiles -> organizations -> profiles recursion loop
CREATE POLICY "organizations_member_select"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND active = true
  )
);

-- 4. Sync organization_members from profiles (migration data fix)
-- Ensures all users with a profile organization are properly added to members table
INSERT INTO organization_members (user_id, organization_id, role, active)
SELECT 
  p.user_id,
  p.organization_id,
  (p.role::text)::app_role,
  true
FROM profiles p
WHERE p.organization_id IS NOT NULL
  AND p.user_id IS NOT NULL
  AND p.role IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;
