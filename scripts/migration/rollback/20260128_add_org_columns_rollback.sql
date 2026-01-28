-- ============================================
-- ROLLBACK: Remove slug and active columns
-- WARNING: Only use if migration causes issues
-- This will remove the columns and all data in them
-- Date: 2026-01-28
-- ============================================

-- Start transaction
BEGIN;

-- Drop unique constraint if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'organizations_slug_unique'
    ) THEN
        ALTER TABLE organizations DROP CONSTRAINT organizations_slug_unique;
        RAISE NOTICE 'Dropped unique constraint on slug';
    END IF;
END $$;

-- Drop index if exists
DROP INDEX IF EXISTS idx_organizations_slug;

-- Remove columns (this will fail if any foreign constraints exist)
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;
ALTER TABLE organizations DROP COLUMN IF EXISTS active;

-- Commit transaction
COMMIT;

SELECT 'Rollback completed. Columns slug and active removed from organizations table.' as status;

-- ============================================
-- RESTORE FROM BACKUP (if needed)
-- To restore the entire table from backup:
-- DROP TABLE organizations;
-- ALTER TABLE organizations_backup_20260128 RENAME TO organizations;
-- ============================================
