-- Install pg_stat_statements extension for performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements SCHEMA extensions;

-- Update get_user_role to differ organization members lookup
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role::text FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Refactor Appointments Select Policy to be more inclusive and robust
DROP POLICY IF EXISTS "consolidated_select_appointments_policy" ON "public"."appointments";

CREATE POLICY "consolidated_select_appointments_policy" ON "public"."appointments"
FOR SELECT
TO public
USING (
  -- Admin and Therapist/Fisioterapeuta can see everything in their organization
  (
    (get_user_role() IN ('admin', 'therapist', 'fisioterapeuta')) AND 
    (organization_id IS NULL OR organization_id = get_current_user_org_id())
  )
  OR
  -- Interns/Estagiaries see their organization data (adjust logic if they should only see specific ones)
  (
    (get_user_role() IN ('intern', 'estagiario')) AND 
    (organization_id IS NULL OR organization_id = get_current_user_org_id())
  )
  OR
  -- Fallback for direct authenticated user organization match
  (
    auth.role() = 'authenticated' AND 
    organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);
