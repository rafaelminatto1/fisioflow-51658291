-- ============================================================
-- SCRIPT: Performance Baseline
-- ============================================================
-- This script establishes a performance baseline before
-- and after applying database optimizations.
--
-- USAGE:
-- 1. Run BEFORE applying migrations to get baseline
-- 2. Run AFTER applying migrations to measure improvement
-- 3. Compare results to verify optimization impact
-- ============================================================

-- ============================================================
-- PART 1: Database size and table statistics
-- ============================================================

SELECT
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value;

SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  round(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================
-- PART 2: Index usage statistics
-- ============================================================

SELECT
  'Total Indexes' as metric,
  COUNT(*) as value
FROM pg_indexes
WHERE schemaname = 'public';

SELECT
  'Unused Indexes (idx_scan = 0)' as metric,
  COUNT(*) as value
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0;

SELECT
  'Rarely Used Indexes (idx_scan < 10)' as metric,
  COUNT(*) as value
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 10;

SELECT
  'Space Used by Unused Indexes' as metric,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as value
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0;

-- ============================================================
-- PART 3: Query performance tests
-- ============================================================

-- Test 1: Patients query (common)
\echo '=== Test 1: Active Patients Query ==='
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT * FROM patients
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 50;

-- Test 2: Appointments query (common)
\echo '=== Test 2: Upcoming Appointments Query ==='
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT a.*, p.full_name, pr.full_name as therapist_name
FROM appointments a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN profiles pr ON a.therapist_id = pr.id
WHERE a.date >= CURRENT_DATE
  AND a.status IN ('agendado', 'confirmado')
ORDER BY a.date, a.start_time
LIMIT 50;

-- Test 3: Sessions query (common)
\echo '=== Test 3: Completed Sessions Query ==='
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT s.*, p.full_name as patient_name
FROM sessions s
JOIN patients p ON s.patient_id = p.id
WHERE s.status = 'completed'
ORDER BY s.created_at DESC
LIMIT 50;

-- Test 4: Payments query (reporting)
\echo '=== Test 4: Paid Payments Query ==='
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT * FROM payments
WHERE status = 'paid'
  AND payment_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY payment_date DESC;

-- Test 5: Organizations query (multi-tenant)
\echo '=== Test 5: Organization Members Query ==='
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT om.*, p.full_name, p.email
FROM organization_members om
JOIN profiles p ON om.user_id = p.user_id
WHERE om.organization_id = '00000000-0000-0000-0000-000000000000'  -- Replace with real org ID
ORDER BY om.role, p.full_name;

-- ============================================================
-- PART 4: RLS Policy performance
-- ============================================================

-- Check which tables have the most complex RLS policies
SELECT
  tablename,
  policyname,
  cmd,
  length(qual) as qual_length,
  CASE
    WHEN qual LIKE '%(SELECT auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN 'NOT OPTIMIZED'
    ELSE 'NO AUTH'
  END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
  AND qual IS NOT NULL
ORDER BY length(qual) DESC
LIMIT 20;

-- ============================================================
-- PART 5: Function performance
-- ============================================================

-- Test dashboard metrics function
\echo '=== Test 6: Dashboard Metrics Function ==='
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT * FROM get_dashboard_metrics(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- ============================================================
-- PART 6: System statistics
-- ============================================================

SELECT
  'Total Tables' as metric,
  COUNT(*) as value
FROM pg_tables
WHERE schemaname = 'public';

SELECT
  'Total RLS Policies' as metric,
  COUNT(*) as value
FROM pg_policies
WHERE schemaname = 'public';

SELECT
  'Tables with RLS Enabled' as metric,
  COUNT(*) as value
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND relkind = 'r'
  AND relrowsecurity = true;

-- ============================================================
-- PART 7: Save results for comparison
-- ============================================================

-- To save results:
-- \o /tmp/baseline_before.txt
-- -- Then run all queries above
-- \o

-- To compare after:
-- diff /tmp/baseline_before.txt /tmp/baseline_after.txt

-- ============================================================
-- EXPECTED IMPROVEMENTS:
-- ============================================================
--
-- After applying Phase 1 optimizations:
--
-- 1. Query execution time: 30-70% faster on RLS-protected tables
-- 2. Buffer usage: Reduced due to fewer index lookups
-- 3. Planning time: Reduced due to simpler RLS policies
-- 4. Dead rows: Reduced after VACUUM due to less bloat
--
-- Key metrics to watch:
-- - Execution time (should decrease)
-- - Buffer hits/reads (ratio should improve)
-- - Planning time (should decrease)
-- - Total cost (should decrease)
-- ============================================================
