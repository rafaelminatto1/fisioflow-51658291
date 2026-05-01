-- Rollback 0037: Make appointment_id and therapist_id NOT NULL again
-- WARNING: Will fail if NULL values exist — clean data first
ALTER TABLE treatment_sessions ALTER COLUMN appointment_id SET NOT NULL;
ALTER TABLE treatment_sessions ALTER COLUMN therapist_id SET NOT NULL;
