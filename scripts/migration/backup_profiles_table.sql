-- Backup profiles table before adding birth_date column
-- Date: 2026-01-28

BEGIN;

-- Create backup table
CREATE TABLE IF NOT EXISTS profiles_backup_20260128 AS
SELECT * FROM profiles;

-- Verify backup
SELECT COUNT(*) as total_rows_backup FROM profiles_backup_20260128;

COMMIT;
