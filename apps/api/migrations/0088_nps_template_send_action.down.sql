BEGIN;
UPDATE crm_automation_rules
   SET acoes = '[{"type":"wait","config":{"days":7}},{"type":"send_whatsapp","config":{"body":"Olá {{nome}}, em uma escala de 0 a 10, o quanto você indicaria a clínica?"}}]'::jsonb,
       updated_at = NOW()
 WHERE id = '00000000-0000-0000-0000-00000000a006' AND organization_id IS NULL;
COMMIT;
