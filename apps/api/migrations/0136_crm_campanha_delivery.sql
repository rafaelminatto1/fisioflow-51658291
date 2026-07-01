-- Disparo real de campanhas WhatsApp: rastreio de entrega/leitura por envio +
-- template aprovado por campanha.
ALTER TABLE crm_campanha_envios ADD COLUMN IF NOT EXISTS meta_message_id text;
ALTER TABLE crm_campanha_envios ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE crm_campanha_envios ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE crm_campanha_envios ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE crm_campanha_envios ADD COLUMN IF NOT EXISTS error text;

CREATE INDEX IF NOT EXISTS idx_campanha_envios_meta_message_id
  ON crm_campanha_envios (meta_message_id);

ALTER TABLE crm_campanhas ADD COLUMN IF NOT EXISTS template_key text;
