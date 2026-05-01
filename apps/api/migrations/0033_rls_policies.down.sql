-- Rollback 0033: Remove RLS policies (disable RLS on affected tables)
DROP POLICY IF EXISTS "org_isolation_patients" ON patients;
DROP POLICY IF EXISTS "org_isolation_appointments" ON appointments;
DROP POLICY IF EXISTS "org_isolation_sessions" ON sessions;
DROP POLICY IF EXISTS "org_isolation_standardized_test_results" ON standardized_test_results;
DROP POLICY IF EXISTS "org_isolation_exercise_plans" ON exercise_plans;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE standardized_test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_plans DISABLE ROW LEVEL SECURITY;
