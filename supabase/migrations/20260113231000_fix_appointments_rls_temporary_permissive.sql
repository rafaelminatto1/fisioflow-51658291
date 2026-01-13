-- Temporary more permissive policy for debugging
-- This allows any authenticated user to see appointments
-- TODO: Remove or restrict after fixing the root cause

-- Drop existing policy
DROP POLICY IF EXISTS "consolidated_select_appointments_policy" ON "public"."appointments";

-- Create very permissive policy for debugging
CREATE POLICY "consolidated_select_appointments_policy" ON "public"."appointments"
FOR SELECT
TO authenticated
USING (
  -- Allow all authenticated users to see appointments
  -- This is temporary for debugging - will be restricted later
  auth.role() = 'authenticated'
);

-- Add comment
COMMENT ON POLICY "consolidated_select_appointments_policy" ON "public"."appointments" IS 
'TEMPORARY: Very permissive policy for debugging RLS issues. Should be restricted after fixing root cause.';
