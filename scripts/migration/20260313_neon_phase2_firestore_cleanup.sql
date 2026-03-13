BEGIN;

ALTER TABLE IF EXISTS appointments
  DROP COLUMN IF EXISTS firestore_id;

ALTER TABLE IF EXISTS exercises
  DROP COLUMN IF EXISTS firestore_id;

ALTER TABLE IF EXISTS sessions
  DROP COLUMN IF EXISTS firestore_id;

ALTER TABLE IF EXISTS exercise_protocols
  DROP COLUMN IF EXISTS firestore_id;

ALTER TABLE IF EXISTS exercise_templates
  DROP COLUMN IF EXISTS firestore_id;

ALTER TABLE IF EXISTS exercise_template_items
  DROP COLUMN IF EXISTS firestore_id;

COMMIT;
