-- Down migration for 0106_profiles_rls
DROP POLICY IF EXISTS policy_profiles_isolation ON profiles;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
