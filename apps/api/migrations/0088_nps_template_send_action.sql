-- 0088_nps_template_send_action.sql
--
-- Atualiza o template global "Alta — NPS em 7 dias" (id a006) para usar a
-- action `send_nps` (cria nps_survey + envia WhatsApp com link público)
-- em vez de `send_whatsapp` genérico.
BEGIN;

UPDATE crm_automation_rules
   SET acoes = '[
     {"type":"wait","config":{"days":7}},
     {"type":"send_nps","config":{"body":"Olá {{nome}}, tudo bem? Sua opinião nos ajuda muito. Em 30s, avalie de 0 a 10: {{nps_link}}"}}
   ]'::jsonb,
       updated_at = NOW()
 WHERE id = '00000000-0000-0000-0000-00000000a006'
   AND organization_id IS NULL;

COMMIT;
