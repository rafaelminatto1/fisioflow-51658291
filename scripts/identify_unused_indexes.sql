-- ============================================================
-- SCRIPT: Identify Unused Indexes
-- ============================================================
-- This script helps identify indexes that have never been used
-- or have very low usage, which can be safely removed to
-- improve write performance and reduce storage.
--
-- USAGE:
-- 1. Run this script to identify candidates
-- 2. Review each index carefully (some may be for periodic jobs)
-- 3. Create migration to drop unused indexes
-- 4. Monitor for 2 weeks before final deletion
-- ============================================================

-- ============================================================
-- PART 1: Identify completely unused indexes
-- ============================================================

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
  AND pg_relation_size(indexrelid) > 100000  -- Larger than 100KB
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================
-- PART 2: Identify rarely used indexes (< 10 scans)
-- ============================================================

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 10  -- Used less than 10 times
  AND pg_relation_size(indexrelid) > 100000  -- Larger than 100KB
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================
-- PART 3: Summary by table (most unused indexes)
-- ============================================================

SELECT
  tablename,
  COUNT(*) as unused_indexes,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_wasted_space
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 10
  AND pg_relation_size(indexrelid) > 100000
GROUP BY tablename
ORDER BY SUM(pg_relation_size(indexrelid)) DESC;

-- ============================================================
-- PART 4: Check for duplicate or redundant indexes
-- ============================================================

-- Find indexes that might be redundant (similar columns)
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    SELECT tablename
    FROM pg_stat_user_indexes
    WHERE idx_scan < 10
  )
ORDER BY tablename, indexname;

-- ============================================================
-- PART 5: Generate DROP statements (review carefully!)
-- ============================================================

-- This generates DROP statements for completely unused indexes
SELECT 'DROP INDEX CONCURRENTLY IF EXISTS ' || indexname || '; -- ' ||
       tablename || ' (' || pg_size_pretty(pg_relation_size(indexrelid)) || ')'
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND pg_relation_size(indexrelid) > 100000
  AND indexname NOT LIKE '%_pkey';  -- Don't drop primary keys

-- ============================================================
-- NOTES:
-- ============================================================
--
-- Before dropping any index, verify:
--
-- 1. Is it used by any periodic jobs (nightly reports, etc.)?
-- 2. Is it used by any rare but critical queries?
-- 3. Is it a constraint index (unique, exclusion, etc.)?
--
-- Safe to drop if:
-- - It's a regular btree index
-- - It has never been used (idx_scan = 0)
-- - No critical queries depend on it
-- - It's not a constraint index
--
-- Process:
-- 1. Run this script weekly for 2 weeks
-- 2. Track which indexes consistently show 0 usage
-- 3. Create migration to drop them
-- 4. Monitor for performance regression
-- ============================================================
