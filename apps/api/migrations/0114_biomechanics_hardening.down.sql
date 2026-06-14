DROP INDEX IF EXISTS idx_biomechanics_job_id;
DROP INDEX IF EXISTS idx_biomechanics_primary_media_id;
DROP INDEX IF EXISTS idx_biomechanics_protocol_id;

ALTER TABLE biomechanics_assessments
  DROP CONSTRAINT IF EXISTS fk_biomechanics_assessments_job_id,
  DROP CONSTRAINT IF EXISTS fk_biomechanics_assessments_primary_media_id,
  DROP CONSTRAINT IF EXISTS fk_biomechanics_assessments_protocol_id;
