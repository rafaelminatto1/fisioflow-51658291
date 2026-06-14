-- Hardening for the complete biomechanics pipeline.
-- Adds referential integrity for optional links introduced in 0113.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_biomechanics_assessments_protocol_id'
  ) THEN
    ALTER TABLE biomechanics_assessments
      ADD CONSTRAINT fk_biomechanics_assessments_protocol_id
      FOREIGN KEY (protocol_id) REFERENCES biomechanics_protocols(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_biomechanics_assessments_primary_media_id'
  ) THEN
    ALTER TABLE biomechanics_assessments
      ADD CONSTRAINT fk_biomechanics_assessments_primary_media_id
      FOREIGN KEY (primary_media_id) REFERENCES biomechanics_media(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_biomechanics_assessments_job_id'
  ) THEN
    ALTER TABLE biomechanics_assessments
      ADD CONSTRAINT fk_biomechanics_assessments_job_id
      FOREIGN KEY (job_id) REFERENCES biomechanics_jobs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_biomechanics_protocol_id
  ON biomechanics_assessments(protocol_id);

CREATE INDEX IF NOT EXISTS idx_biomechanics_primary_media_id
  ON biomechanics_assessments(primary_media_id);

CREATE INDEX IF NOT EXISTS idx_biomechanics_job_id
  ON biomechanics_assessments(job_id);
