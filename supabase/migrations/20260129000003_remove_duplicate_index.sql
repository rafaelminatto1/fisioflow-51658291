-- ============================================================
-- MIGRATION: Remove Duplicate Index
-- ============================================================
-- This migration removes a duplicate index on the patients table.
-- The table has two identical indexes:
-- - idx_patients_full_name_status
-- - idx_patients_name_status
--
-- We keep idx_patients_name_status and drop the other.
--
-- Impact: Reduces storage and improves write performance
-- ============================================================

-- Drop the duplicate index
-- Using CONCURRENTLY to avoid blocking reads/writes
DROP INDEX CONCURRENTLY IF EXISTS idx_patients_full_name_status;

-- The idx_patients_name_status index is kept
-- It provides the same functionality

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Verify duplicate index was removed:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'patients'
--   AND indexname LIKE '%name%status%';
--
-- Expected: Only idx_patients_name_status should remain
