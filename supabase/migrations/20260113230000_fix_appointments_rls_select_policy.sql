-- Fix appointments RLS policy to allow access when user is authenticated
-- Issue: consolidated_select_appointments_policy blocks access when get_user_role() returns NULL

-- Drop existing policy
DROP POLICY IF EXISTS "consolidated_select_appointments_policy" ON "public"."appointments";

-- Create improved policy that handles NULL roles and uses multiple fallbacks
CREATE POLICY "consolidated_select_appointments_policy" ON "public"."appointments"
FOR SELECT
TO authenticated
USING (
  -- Case 1: User has role in organization_members and org matches
  (
    get_user_role() IN ('admin', 'therapist', 'fisioterapeuta', 'intern', 'estagiario') AND 
    (organization_id IS NULL OR organization_id = get_current_user_org_id())
  )
  OR
  -- Case 2: User is authenticated and organization matches (fallback for profiles table)
  (
    auth.role() = 'authenticated' AND 
    (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
      OR organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  )
  OR
  -- Case 3: Allow if organization_id is NULL (legacy appointments)
  organization_id IS NULL
);

-- Add comment
COMMENT ON POLICY "consolidated_select_appointments_policy" ON "public"."appointments" IS 
'Allows authenticated users to view appointments in their organization. Handles cases where user role may be NULL.';
