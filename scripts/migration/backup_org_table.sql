-- ============================================
-- BACKUP: Create backup of organizations table
-- Run this BEFORE migration
-- Date: 2026-01-28
-- ============================================

-- Create backup table with timestamp
CREATE TABLE IF NOT EXISTS organizations_backup_20260128 AS
SELECT * FROM organizations;

-- Verify backup
SELECT
  'organizations_backup_20260128' as table_name,
  COUNT(*) as total_rows,
  NOW() as backup_timestamp
FROM organizations_backup_20260128;

SELECT 'Backup completed successfully! Table: organizations_backup_20260128' as status;
