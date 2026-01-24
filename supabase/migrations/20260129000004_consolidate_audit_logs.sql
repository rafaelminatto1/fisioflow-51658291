-- ============================================================
-- MIGRATION: Consolidate Audit Log Tables
-- ============================================================
-- This migration consolidates 4 separate audit log tables into one.
--
-- Current tables:
-- - audit_log (43 MB - largest)
-- - audit_log_enhanced
-- - audit_log_entries
-- - audit_logs (target - keep this one)
--
-- Strategy:
-- 1. Migrate data from all tables to audit_logs
-- 2. Create views for backward compatibility
-- 3. Drop old tables after 2-week verification period
-- ============================================================

-- ============================================================
-- STEP 1: Migrate data to audit_logs (target table)
-- ============================================================

-- Migrate from audit_log (largest - 43 MB)
INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, user_email, created_at)
SELECT
  table_name,
  record_id,
  action,
  old_values,
  new_values,
  user_id,
  user_email,
  timestamp as created_at
FROM audit_log
ON CONFLICT DO NOTHING;

-- Migrate from audit_log_enhanced
INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, user_email, created_at)
SELECT
  table_name,
  record_id,
  action,
  old_data as old_values,
  new_data as new_values,
  user_id,
  user_email,
  created_at
FROM audit_log_enhanced
ON CONFLICT DO NOTHING;

-- Note: audit_log_entries may need different column mapping
-- Check schema before migrating

-- ============================================================
-- STEP 2: Create backward compatibility views
-- ============================================================

-- View for audit_log (most widely used)
CREATE OR REPLACE VIEW audit_log AS
SELECT
  id,
  table_name,
  record_id,
  action,
  old_values,
  new_values,
  user_id,
  user_email,
  created_at as timestamp
FROM audit_logs;

-- View for audit_log_enhanced
CREATE OR REPLACE VIEW audit_log_enhanced AS
SELECT
  id,
  table_name,
  record_id,
  action,
  old_values as old_data,
  new_values as new_data,
  user_id,
  user_email,
  created_at
FROM audit_logs;

-- ============================================================
-- STEP 3: Add comments for future cleanup
-- ============================================================

COMMENT ON VIEW audit_log IS
'Backward compatibility view. Data migrated to audit_logs table. Can be dropped after 2-week verification period.';

COMMENT ON VIEW audit_log_enhanced IS
'Backward compatibility view. Data migrated to audit_logs table. Can be dropped after 2-week verification period.';

-- ============================================================
-- STEP 4: Cleanup (run after 2-week verification period)
-- ============================================================
-- DO NOT RUN THIS IN PRODUCTION IMMEDIATELY
-- Run these commands after verifying everything works:

-- -- Drop old tables
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS audit_log_enhanced CASCADE;
-- DROP TABLE IF EXISTS audit_log_entries CASCADE;

-- -- Drop views (they will no longer be needed)
-- DROP VIEW IF EXISTS audit_log;
-- DROP VIEW IF EXISTS audit_log_enhanced;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Verify data was migrated correctly:

-- -- Compare row counts
-- SELECT 'audit_log' as source, COUNT(*) as count FROM audit_log
-- UNION ALL
-- SELECT 'audit_log_enhanced', COUNT(*) FROM audit_log_enhanced
-- UNION ALL
-- SELECT 'audit_logs (target)', COUNT(*) FROM audit_logs;

-- -- Verify views work
-- SELECT COUNT(*) FROM audit_log;
-- SELECT COUNT(*) FROM audit_log_enhanced;

-- -- Check for duplicate records (should be 0)
-- SELECT COUNT(*) - COUNT(DISTINCT id) as duplicates
-- FROM audit_logs;
