-- Rollback de 0085_lead_conversion_trigger.sql
BEGIN;
DROP TRIGGER IF EXISTS trg_lead_stage_to_contact_lifecycle ON leads;
DROP TRIGGER IF EXISTS trg_lead_efetivado_to_patient ON leads;
DROP FUNCTION IF EXISTS lead_stage_to_contact_lifecycle();
DROP FUNCTION IF EXISTS lead_efetivado_to_patient();
COMMIT;
