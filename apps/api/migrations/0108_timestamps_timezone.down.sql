-- Down migration for 0108_timestamps_timezone
-- Remove timezone from timestamps (revert to without timezone)
ALTER TABLE transactions ALTER COLUMN created_at TYPE timestamp;
ALTER TABLE transactions ALTER COLUMN updated_at TYPE timestamp;
ALTER TABLE transactions ALTER COLUMN deleted_at TYPE timestamp;
