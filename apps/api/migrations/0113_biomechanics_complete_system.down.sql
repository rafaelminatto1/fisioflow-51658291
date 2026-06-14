DELETE FROM biomechanics_protocols
WHERE organization_id IS NULL
  AND slug IN (
    'running-gait-sagittal-posterior',
    'walking-gait-6m',
    'cmj-hop-performance',
    'posture-static-3views',
    'functional-squat-stepdown'
  );

DROP TABLE IF EXISTS biomechanics_review_actions;
DROP TABLE IF EXISTS biomechanics_annotations;
DROP TABLE IF EXISTS biomechanics_events;
DROP TABLE IF EXISTS biomechanics_frames;
DROP TABLE IF EXISTS biomechanics_jobs;
DROP TABLE IF EXISTS biomechanics_media;
DROP TABLE IF EXISTS biomechanics_protocols;

ALTER TABLE biomechanics_metrics
  DROP COLUMN IF EXISTS algorithm_version,
  DROP COLUMN IF EXISTS severity,
  DROP COLUMN IF EXISTS normal_range,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS confidence,
  DROP COLUMN IF EXISTS view,
  DROP COLUMN IF EXISTS phase,
  DROP COLUMN IF EXISTS side;

ALTER TABLE biomechanics_assessments
  DROP COLUMN IF EXISTS signature_metadata,
  DROP COLUMN IF EXISTS signed_at,
  DROP COLUMN IF EXISTS report_hash,
  DROP COLUMN IF EXISTS validated_at,
  DROP COLUMN IF EXISTS validated_by,
  DROP COLUMN IF EXISTS algorithm_version,
  DROP COLUMN IF EXISTS capture_context,
  DROP COLUMN IF EXISTS quality_score,
  DROP COLUMN IF EXISTS job_id,
  DROP COLUMN IF EXISTS primary_media_id,
  DROP COLUMN IF EXISTS protocol_id;
