-- Rollback 0040: Remove WhatsApp automation rules and snooze
DROP TABLE IF EXISTS wa_snooze;
DROP TABLE IF EXISTS wa_automation_rules;
