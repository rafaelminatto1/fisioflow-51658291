ALTER TABLE crm_campanhas DROP COLUMN IF EXISTS template_key;
DROP INDEX IF EXISTS idx_campanha_envios_meta_message_id;
ALTER TABLE crm_campanha_envios DROP COLUMN IF EXISTS error;
ALTER TABLE crm_campanha_envios DROP COLUMN IF EXISTS read_at;
ALTER TABLE crm_campanha_envios DROP COLUMN IF EXISTS delivered_at;
ALTER TABLE crm_campanha_envios DROP COLUMN IF EXISTS phone;
ALTER TABLE crm_campanha_envios DROP COLUMN IF EXISTS meta_message_id;
