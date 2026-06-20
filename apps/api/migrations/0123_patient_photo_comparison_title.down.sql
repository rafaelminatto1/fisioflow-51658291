DROP INDEX IF EXISTS idx_patient_photos_comparison_title;

ALTER TABLE patient_photos
DROP COLUMN IF EXISTS comparison_group_title;
