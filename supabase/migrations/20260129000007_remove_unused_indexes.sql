-- ============================================================
-- MIGRATION: Remove Unused Indexes
-- ============================================================
-- This migration removes indexes that have never been used
-- (idx_scan = 0) or have very low usage.
--
-- Impact: Reduces storage, improves write performance
-- ============================================================

-- ============================================================
-- SAFE REMOVAL - Run verification first
-- ============================================================

-- Step 1: Identify unused indexes (DO NOT drop yet)
-- Save results to review before dropping
CREATE TEMP TABLE unused_indexes_analysis AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as size_bytes,
  pg_relation_size(indexrelid) as size_num
FROM pg_stat_user_indexes
WHERE idx_scan < 10  -- Less than 10 uses
  AND pg_relation_size(indexrelid) > 100000  -- Larger than 100KB
  AND schemaname = 'public'
ORDER BY size_num DESC;

-- Review the results:
-- SELECT * FROM unused_indexes_analysis;

-- ============================================================
-- PART 1: Remove specific unused indexes
-- ============================================================

-- Note: Duplicate index already removed in migration 00003
-- idx_patients_full_name_status - KEEP removed

-- Add more unused indexes here after reviewing analysis:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_example_unused;

-- ============================================================
-- PART 2: Index consolidation recommendations
-- ============================================================

-- Review these cases manually:
-- 1. idx_patients_name vs idx_patients_name_status
--    If most queries filter by status, keep only composite

-- 2. Single-column indexes covered by multi-column indexes
--    Example: (col1) index when (col1, col2) exists

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check remaining indexes:
SELECT
  tablename,
  COUNT(*) as index_count,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY SUM(pg_relation_size(indexrelid)) DESC;

-- ============================================================
-- NOTES
-- ============================================================

-- This migration is intentionally conservative.
-- Only drop indexes you have verified are truly unused.
--
-- To identify candidates, run:
-- scripts/identify_unused_indexes.sql
--
-- After 2 weeks of monitoring unused_indexes_analysis,
-- you can safely drop confirmed unused indexes.
