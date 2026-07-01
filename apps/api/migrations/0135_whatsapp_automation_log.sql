-- Log dos disparos automáticos de WhatsApp (welcome/feedback/review/lembrete).
-- Alimenta a lista "Últimos disparos" na aba Automações (monitoramento sem SQL).
CREATE TABLE IF NOT EXISTS whatsapp_automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  template_key text NOT NULL,
  phone text,
  accepted boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_automation_log_org_created
  ON whatsapp_automation_log (organization_id, created_at DESC);
