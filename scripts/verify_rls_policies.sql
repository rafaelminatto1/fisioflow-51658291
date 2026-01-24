-- ============================================================
-- SCRIPT: Verify RLS Policy Performance
-- ============================================================
-- This script checks RLS policies for performance issues
-- and verifies that fixes have been applied correctly.
--
-- USAGE:
-- Run before and after applying RLS InitPlan fixes
-- ============================================================

-- ============================================================
-- PART 1: Check for policies with nested auth.uid() calls
-- ============================================================

-- This finds policies that still have the InitPlan issue
-- (multiple nested auth.uid() calls)

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE
    WHEN length(qual) > 1000 THEN 'COMPLEX (>1KB)'
    WHEN length(qual) > 500 THEN 'MEDIUM'
    ELSE 'SIMPLE'
  END as complexity,
  length(qual) as qual_length,
  CASE
    WHEN qual LIKE '%(SELECT auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 'NEEDS FIX'
    ELSE 'N/A'
  END as auth_uid_status
FROM pg_policies
WHERE schemaname = 'public'
  AND qual IS NOT NULL
ORDER BY
  CASE WHEN qual LIKE '%(SELECT auth.uid())%' THEN 1 ELSE 0 END,
  tablename, policyname;

-- ============================================================
-- PART 2: Count policies by optimization status
-- ============================================================

SELECT
  CASE
    WHEN qual LIKE '%(SELECT auth.uid())%' THEN 'OPTIMIZED (using SELECT)'
    WHEN qual LIKE '%auth.uid()%' THEN 'NEEDS FIX (direct auth.uid)'
    ELSE 'NO AUTH CALLS'
  END as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND qual IS NOT NULL
GROUP BY status;

-- ============================================================
-- PART 3: Find tables with most policies
-- ============================================================

SELECT
  tablename,
  COUNT(*) as policy_count,
  COUNT(DISTINCT cmd) as commands_protected,
  string_agg(DISTINCT cmd, ', ') as commands
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC
LIMIT 20;

-- ============================================================
-- PART 4: Check for multiple permissive policies
-- ============================================================

-- This finds tables that have multiple permissive policies
-- for the same command (can be consolidated for performance)

SELECT
  tablename,
  cmd,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = true
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC;

-- ============================================================
-- PART 5: Verify RLS is enabled on all tables
-- ============================================================

SELECT
  tablename,
  CASE
    WHEN relrowsecurity THEN 'ENABLED'
    ELSE 'DISABLED - RISK!'
  END as rls_status,
  relforcerowsecurity as force_rls
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND relkind = 'r'  -- regular tables only
ORDER BY relrowsecurity DESC, tablename;

-- ============================================================
-- PART 6: Test query performance (before/after)
-- ============================================================

-- Test query on patients table
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM patients
WHERE status = 'active'
LIMIT 10;

-- Test query on appointments table
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM appointments
WHERE date >= CURRENT_DATE
  AND status IN ('agendado', 'confirmado')
LIMIT 10;

-- Test query on sessions table
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sessions
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- PART 7: Check for functions with auth calls
-- ============================================================

SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) AS definition,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 'HAS search_path'
    ELSE 'MISSING search_path - SECURITY RISK'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc LIKE '%auth%'
ORDER BY search_path_status, p.proname;

-- ============================================================
-- VERIFICATION CHECKLIST:
-- ============================================================
--
-- After applying fixes, verify:
--
-- [ ] All policies use (SELECT auth.uid()) instead of auth.uid()
-- [ ] No tables have RLS disabled (unless intentional)
-- [ ] Multiple permissive policies have been consolidated
-- [ ] All functions with auth calls have SET search_path
-- [ ] EXPLAIN ANALYZE shows improved performance
-- [ ] No SQL errors in application logs
-- ============================================================
