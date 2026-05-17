-- Rollback de 0084_contacts_backfill.sql
-- Limpa apenas dados backfillados (linhas com tipo lead_created/patient_created)
-- e zera contact_id em leads/patients/appointments/sessions.
BEGIN;

UPDATE sessions     SET contact_id = NULL WHERE contact_id IS NOT NULL;
UPDATE appointments SET contact_id = NULL WHERE contact_id IS NOT NULL;
UPDATE leads        SET contact_id = NULL WHERE contact_id IS NOT NULL;
UPDATE patients     SET contact_id = NULL WHERE contact_id IS NOT NULL;

DELETE FROM contact_activities WHERE tipo IN ('lead_created','patient_created')
  AND payload->>'backfill' = 'true';

DELETE FROM contacts WHERE primary_lead_id IS NOT NULL OR primary_patient_id IS NOT NULL;

DROP FUNCTION IF EXISTS normalize_phone(TEXT);

COMMIT;
