-- ============================================================
-- MIGRATION: Add Missing Foreign Key Index
-- ============================================================
-- This migration adds an index for the foreign key on waitlist.created_by
-- which was identified as missing by the performance advisor.
--
-- Impact: Improves JOIN performance when querying waitlist with users
-- ============================================================

-- Add index for waitlist.created_by foreign key
-- Using CONCURRENTLY to avoid blocking reads/writes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waitlist_created_by
ON waitlist(created_by);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Verify index was created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'waitlist'
--   AND indexname = 'idx_waitlist_created_by';

-- Check index usage after some time:
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'waitlist'
--   AND indexname = 'idx_waitlist_created_by';
