-- Rollback de 0083_contacts_unified.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_contacts_set_updated_at ON contacts;
DROP FUNCTION IF EXISTS contacts_set_updated_at();

ALTER TABLE IF EXISTS sessions     DROP CONSTRAINT IF EXISTS fk_sessions_contact_id;
ALTER TABLE IF EXISTS appointments DROP CONSTRAINT IF EXISTS fk_appointments_contact_id;
ALTER TABLE IF EXISTS patients     DROP CONSTRAINT IF EXISTS fk_patients_contact_id;
ALTER TABLE IF EXISTS leads        DROP CONSTRAINT IF EXISTS fk_leads_contact_id;

DROP INDEX IF EXISTS idx_sessions_contact_id;
DROP INDEX IF EXISTS idx_appointments_contact_id;
DROP INDEX IF EXISTS idx_patients_contact_id;
DROP INDEX IF EXISTS idx_leads_contact_id;

ALTER TABLE IF EXISTS sessions               DROP COLUMN IF EXISTS contact_id;
ALTER TABLE IF EXISTS appointments           DROP COLUMN IF EXISTS contact_id;
ALTER TABLE IF EXISTS patients               DROP COLUMN IF EXISTS contact_id;
ALTER TABLE IF EXISTS leads                  DROP COLUMN IF EXISTS contact_id;
ALTER TABLE IF EXISTS crm_campanha_envios    DROP COLUMN IF EXISTS contact_id;

DROP TABLE IF EXISTS contact_scores;
DROP TABLE IF EXISTS contact_activities;
DROP TABLE IF EXISTS contacts;
DROP TYPE  IF EXISTS contact_lifecycle_stage;

COMMIT;
