BEGIN;
DROP TRIGGER IF EXISTS trg_crm_automation_rules_touch ON crm_automation_rules;
DROP FUNCTION IF EXISTS crm_automation_rules_touch();
DROP TABLE IF EXISTS crm_automation_executions;
DROP TABLE IF EXISTS crm_automation_rules;
COMMIT;
