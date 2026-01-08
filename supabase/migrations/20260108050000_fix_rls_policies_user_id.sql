-- Fix RLS policies that incorrectly use profiles.id = auth.uid()
-- The correct check should be profiles.user_id = auth.uid()

-- Drop and recreate patients policies
DROP POLICY IF EXISTS "patients_org_select" ON patients;
DROP POLICY IF EXISTS "patients_org_insert" ON patients;
DROP POLICY IF EXISTS "patients_org_update" ON patients;
DROP POLICY IF EXISTS "patients_org_delete" ON patients;

CREATE POLICY "patients_org_select" ON patients FOR SELECT TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "patients_org_insert" ON patients FOR INSERT TO authenticated
WITH CHECK (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "patients_org_update" ON patients FOR UPDATE TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "patients_org_delete" ON patients FOR DELETE TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

-- Drop and recreate appointments policies
DROP POLICY IF EXISTS "appointments_org_select" ON appointments;
DROP POLICY IF EXISTS "appointments_org_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_org_update" ON appointments;
DROP POLICY IF EXISTS "appointments_org_delete" ON appointments;

CREATE POLICY "appointments_org_select" ON appointments FOR SELECT TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "appointments_org_insert" ON appointments FOR INSERT TO authenticated
WITH CHECK (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "appointments_org_update" ON appointments FOR UPDATE TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "appointments_org_delete" ON appointments FOR DELETE TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

-- Drop and recreate sessions policies
DROP POLICY IF EXISTS "sessions_org_select" ON sessions;
DROP POLICY IF EXISTS "sessions_org_insert" ON sessions;
DROP POLICY IF EXISTS "sessions_org_update" ON sessions;
DROP POLICY IF EXISTS "sessions_org_delete" ON sessions;

CREATE POLICY "sessions_org_select" ON sessions FOR SELECT TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "sessions_org_insert" ON sessions FOR INSERT TO authenticated
WITH CHECK (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "sessions_org_update" ON sessions FOR UPDATE TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "sessions_org_delete" ON sessions FOR DELETE TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

-- Drop and recreate waitlist policies
DROP POLICY IF EXISTS "waitlist_org_all" ON waitlist;

CREATE POLICY "waitlist_org_all" ON waitlist FOR ALL TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
))
WITH CHECK (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

-- Drop and recreate audit_logs policies
DROP POLICY IF EXISTS "audit_logs_org_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_org_insert" ON audit_logs;

CREATE POLICY "audit_logs_org_select" ON audit_logs FOR SELECT TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

CREATE POLICY "audit_logs_org_insert" ON audit_logs FOR INSERT TO authenticated
WITH CHECK (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));

-- Drop and recreate leads policies
DROP POLICY IF EXISTS "leads_org_all" ON leads;

CREATE POLICY "leads_org_all" ON leads FOR ALL TO authenticated
USING (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
))
WITH CHECK (organization_id = (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
));
