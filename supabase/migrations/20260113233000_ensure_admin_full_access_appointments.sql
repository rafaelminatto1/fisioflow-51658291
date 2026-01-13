-- Ensure admins have full access to appointments
-- This policy ensures that users with admin role can access all appointments

-- Drop the temporary permissive policy
DROP POLICY IF EXISTS "consolidated_select_appointments_policy" ON "public"."appointments";

-- Create policy that ensures admins have full access
CREATE POLICY "consolidated_select_appointments_policy" ON "public"."appointments"
FOR SELECT
TO authenticated
USING (
  -- Admins have full access (check both user_roles and organization_members)
  (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  OR
  -- Other users: check organization match
  (
    auth.role() = 'authenticated' AND 
    (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
      OR organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  )
);

-- Add comment
COMMENT ON POLICY "consolidated_select_appointments_policy" ON "public"."appointments" IS 
'Allows authenticated users to view appointments. Admins have full access. Other users can only see appointments in their organization.';
