-- Rollback 0059
ALTER TABLE xp_transactions DROP COLUMN IF EXISTS metadata;
ALTER TABLE xp_transactions DROP COLUMN IF EXISTS source;
DROP TABLE IF EXISTS patient_streaks;
