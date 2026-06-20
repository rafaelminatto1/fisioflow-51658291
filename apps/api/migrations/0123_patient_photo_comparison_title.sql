ALTER TABLE patient_photos
ADD COLUMN IF NOT EXISTS comparison_group_title VARCHAR(160);

CREATE INDEX IF NOT EXISTS idx_patient_photos_comparison_title
  ON patient_photos(comparison_group_title)
  WHERE comparison_group_title IS NOT NULL;
