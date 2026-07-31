-- Rollback de 0154.
DROP INDEX IF EXISTS idx_patient_goals_icf;
ALTER TABLE patient_goals DROP CONSTRAINT IF EXISTS patient_goals_icf_class_chk;
ALTER TABLE patient_goals DROP COLUMN IF EXISTS icf_class;
