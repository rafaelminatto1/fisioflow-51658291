-- Fix organizations RLS policy that incorrectly uses profiles.id instead of profiles.user_id
-- This is causing 406 errors when querying organizations

-- Drop the incorrect policy
DROP POLICY IF EXISTS "organizations_member_select" ON public.organizations;

-- Recreate with correct user_id reference
CREATE POLICY "organizations_member_select"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT profiles.organization_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- Sync organization_members from profiles (for RLS policy "Membros podem ver sua organização")
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
