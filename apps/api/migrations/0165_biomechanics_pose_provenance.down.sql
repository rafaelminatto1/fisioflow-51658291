-- Reverte 0165.
--
-- ATENÇÃO: reverter reabre o caminho entre métrica sintética e laudo assinado.
-- As colunas são aditivas e o DROP não perde medição real — mas a procedência
-- de cada número é perdida, e com ela a capacidade de dizer no laudo se aquele
-- ângulo veio de pose no aparelho, de reprocessamento em nuvem ou da mão do
-- profissional. Só reverta se a 0165 estiver quebrando produção.

DROP TRIGGER IF EXISTS trg_bio_block_metric_mutation_when_signed ON biomechanics_metrics;
DROP FUNCTION IF EXISTS bio_block_metric_mutation_when_signed();

DROP TRIGGER IF EXISTS trg_bio_block_synthetic_on_signed ON biomechanics_assessments;
DROP FUNCTION IF EXISTS bio_block_synthetic_on_signed();

ALTER TABLE biomechanics_assessments DROP CONSTRAINT IF EXISTS chk_bio_assessment_status;

DROP INDEX IF EXISTS uq_bio_jobs_idempotency;
DROP INDEX IF EXISTS idx_bio_metric_live;

ALTER TABLE biomechanics_assessments
  DROP COLUMN IF EXISTS pose_provenance,
  DROP COLUMN IF EXISTS amends_assessment_id,
  DROP COLUMN IF EXISTS superseded_by_assessment_id,
  DROP COLUMN IF EXISTS locked_at;

ALTER TABLE biomechanics_jobs
  DROP COLUMN IF EXISTS phase,
  DROP COLUMN IF EXISTS input_digest,
  DROP COLUMN IF EXISTS supersedes_job_id;

ALTER TABLE biomechanics_events
  DROP COLUMN IF EXISTS provenance,
  DROP COLUMN IF EXISTS job_id,
  DROP COLUMN IF EXISTS superseded_at;

ALTER TABLE biomechanics_frames
  DROP COLUMN IF EXISTS provenance,
  DROP COLUMN IF EXISTS attempt,
  DROP COLUMN IF EXISTS view;

ALTER TABLE biomechanics_media
  DROP COLUMN IF EXISTS landmarks_r2_key,
  DROP COLUMN IF EXISTS landmarks_schema,
  DROP COLUMN IF EXISTS landmarks_sha256,
  DROP COLUMN IF EXISTS landmarks_bytes,
  DROP COLUMN IF EXISTS frame_count,
  DROP COLUMN IF EXISTS attempt,
  DROP COLUMN IF EXISTS pose_engine,
  DROP COLUMN IF EXISTS coordinate_space;

ALTER TABLE biomechanics_metrics
  DROP COLUMN IF EXISTS provenance,
  DROP COLUMN IF EXISTS pose_engine,
  DROP COLUMN IF EXISTS job_id,
  DROP COLUMN IF EXISTS media_id,
  DROP COLUMN IF EXISTS attempt,
  DROP COLUMN IF EXISTS sample_count,
  DROP COLUMN IF EXISTS superseded_by,
  DROP COLUMN IF EXISTS superseded_at,
  DROP COLUMN IF EXISTS acknowledged_by,
  DROP COLUMN IF EXISTS acknowledged_at,
  DROP COLUMN IF EXISTS computed_at;

DROP TYPE IF EXISTS biomechanics_metric_provenance;
