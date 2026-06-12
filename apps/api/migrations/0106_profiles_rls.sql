-- Migration 0106: Enable RLS on profiles table with org isolation policy
-- Fixes security gap where profiles could be read across organizations via Data API.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (Neon/Postgres bypasses RLS for owner by default)
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY policy_profiles_isolation ON profiles
  FOR ALL
  TO authenticated
  USING (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid))
  WITH CHECK (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid));
