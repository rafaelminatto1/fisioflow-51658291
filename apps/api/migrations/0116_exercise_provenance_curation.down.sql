-- 0116_exercise_provenance_curation.down.sql
DROP TABLE IF EXISTS exercise_import_candidates;
ALTER TABLE exercises DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE exercises DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE exercises DROP COLUMN IF EXISTS review_status;
ALTER TABLE exercises DROP COLUMN IF EXISTS source_license;
ALTER TABLE exercises DROP COLUMN IF EXISTS source_url;
ALTER TABLE exercises DROP COLUMN IF EXISTS source_id;
ALTER TABLE exercises DROP COLUMN IF EXISTS source;
