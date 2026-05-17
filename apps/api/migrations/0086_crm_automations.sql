-- 0086_crm_automations.sql
--
-- Motor de automações do CRM (contact-centric). Complementa o
-- `wa_automation_rules` (que é conversational/whatsapp-inbox-centric):
-- aqui o gatilho é mudança de contato (lead criado, estágio mudou,
-- aniversário, alta clínica, NPS baixo, no-show) e as ações operam
-- sobre `contacts` / `crm_tarefas` / `whatsapp` / `email`.
--
-- Idempotente. Inclui seed de 8 templates oficiais.

BEGIN;

-- =========================================================================
-- 1. crm_automation_rules
-- =========================================================================
CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,

  -- Tipos canônicos: lead_created | stage_changed | birthday | discharge
  --                  | nps_low | appointment_no_show | inactivity
  gatilho_tipo    TEXT NOT NULL,
  gatilho_config  JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Lista de condições AVALIADAS após match do gatilho.
  -- Formato: [{ field, operator: eq|neq|contains|gt|lt|in, value }]
  condicoes       JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Lista ordenada de ações.
  -- Formato: [{ type, config, delay_seconds? }]
  --   type: send_whatsapp | send_email | create_task | update_stage
  --       | add_tag | wait | webhook
  acoes           JSONB NOT NULL DEFAULT '[]'::JSONB,

  prioridade      INTEGER NOT NULL DEFAULT 100,
  -- Limita execuções para evitar loops em mudanças rápidas
  cooldown_minutes INTEGER NOT NULL DEFAULT 0,

  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_auto_rules_org_trig
  ON crm_automation_rules(organization_id, gatilho_tipo) WHERE ativo;

-- =========================================================================
-- 2. crm_automation_executions
-- =========================================================================
CREATE TABLE IF NOT EXISTS crm_automation_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rule_id         UUID NOT NULL REFERENCES crm_automation_rules(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,

  -- pending | running | completed | failed | skipped
  status          TEXT NOT NULL DEFAULT 'pending',
  action_index    INTEGER NOT NULL DEFAULT 0,  -- qual passo da lista `acoes`
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_auto_exec_pending
  ON crm_automation_executions(scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_crm_auto_exec_contact
  ON crm_automation_executions(contact_id, created_at DESC);

-- Idempotência: não duplicar execução para mesma regra+contato dentro do
-- cooldown (controlado pela aplicação via cooldown_minutes).
CREATE INDEX IF NOT EXISTS idx_crm_auto_exec_rule_contact_created
  ON crm_automation_executions(rule_id, contact_id, created_at DESC);

-- =========================================================================
-- 3. Trigger updated_at
-- =========================================================================
CREATE OR REPLACE FUNCTION crm_automation_rules_touch() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_automation_rules_touch ON crm_automation_rules;
CREATE TRIGGER trg_crm_automation_rules_touch
  BEFORE UPDATE ON crm_automation_rules
  FOR EACH ROW EXECUTE FUNCTION crm_automation_rules_touch();

-- =========================================================================
-- 4. Seed de templates (organization_id = NULL = template global do sistema)
-- =========================================================================
INSERT INTO crm_automation_rules (id, organization_id, nome, descricao, ativo,
  gatilho_tipo, gatilho_config, condicoes, acoes, prioridade, cooldown_minutes, created_by)
SELECT * FROM (VALUES
  (
    '00000000-0000-0000-0000-00000000a001'::uuid,
    NULL::uuid,
    'Boas-vindas WhatsApp ao novo lead',
    'Envia mensagem de boas-vindas em até 1 minuto após cadastro do lead.',
    false,
    'lead_created',
    '{}'::jsonb,
    '[]'::jsonb,
    '[{"type":"send_whatsapp","delay_seconds":60,"config":{"template":"boas_vindas_lead","body":"Olá {{nome}}, recebemos seu contato! Em breve nossa equipe entrará em contato."}}]'::jsonb,
    100, 1440, 'system'
  ),
  (
    '00000000-0000-0000-0000-00000000a002'::uuid,
    NULL,
    'Follow-up: 3 dias sem contato',
    'Cria tarefa para a equipe quando lead fica 3 dias parado em em_contato.',
    false,
    'inactivity',
    '{"days":3,"in_stages":["em_contato","aguardando"]}'::jsonb,
    '[]'::jsonb,
    '[{"type":"create_task","config":{"titulo":"Follow-up com {{nome}}","prioridade":"alta"}}]'::jsonb,
    100, 4320, 'system'
  ),
  (
    '00000000-0000-0000-0000-00000000a003'::uuid,
    NULL,
    'Avaliação agendada — confirmação 24h',
    'Envia WhatsApp 24h antes da avaliação confirmando presença.',
    false,
    'stage_changed',
    '{"to":"avaliacao_agendada"}'::jsonb,
    '[]'::jsonb,
    '[{"type":"send_whatsapp","delay_seconds":3600,"config":{"body":"Olá {{nome}}, lembrando da sua avaliação. Confirma presença? Responda SIM."}}]'::jsonb,
    100, 1440, 'system'
  ),
  (
    '00000000-0000-0000-0000-00000000a004'::uuid,
    NULL,
    'Não efetivado — reativação 30d',
    'Reativa lead 30 dias após nao_efetivado.',
    false,
    'stage_changed',
    '{"to":"nao_efetivado"}'::jsonb,
    '[]'::jsonb,
    '[{"type":"wait","config":{"days":30}},{"type":"send_whatsapp","config":{"body":"Olá {{nome}}, faz um tempo que conversamos. Posso te ajudar agora?"}}]'::jsonb,
    100, 43200, 'system'
  ),
  (
    '00000000-0000-0000-0000-00000000a005'::uuid,
    NULL,
    'Aniversário do contato',
    'Mensagem de aniversário pelo WhatsApp.',
    false,
    'birthday',
    '{}'::jsonb,
    '[]'::jsonb,
    '[{"type":"send_whatsapp","config":{"body":"Feliz aniversário, {{nome}}! 🎉 Toda a equipe deseja saúde e movimento."}}]'::jsonb,
    100, 1440, 'system'
  ),
  (
    '00000000-0000-0000-0000-00000000a006'::uuid,
    NULL,
    'Alta clínica — pesquisa NPS em 7 dias',
    'Dispara envio de NPS 7 dias após última sessão concluída.',
    false,
    'discharge',
    '{}'::jsonb,
    '[]'::jsonb,
    '[{"type":"wait","config":{"days":7}},{"type":"send_whatsapp","config":{"body":"Olá {{nome}}, em uma escala de 0 a 10, o quanto você indicaria a clínica?"}}]'::jsonb,
    100, 10080, 'system'
  ),
  (
    '00000000-0000-0000-0000-00000000a007'::uuid,
    NULL,
    'NPS baixo — alerta admin',
    'Notifica equipe quando NPS <= 6.',
    false,
    'nps_low',
    '{"threshold":6}'::jsonb,
    '[]'::jsonb,
    '[{"type":"create_task","config":{"titulo":"NPS baixo de {{nome}} — ligar","prioridade":"urgente"}}]'::jsonb,
    100, 60, 'system'
  ),
  (
    '00000000-0000-0000-0000-00000000a008'::uuid,
    NULL,
    'No-show — recontato automático',
    'Tenta reagendar via WhatsApp após falta sem aviso.',
    false,
    'appointment_no_show',
    '{}'::jsonb,
    '[]'::jsonb,
    '[{"type":"send_whatsapp","delay_seconds":7200,"config":{"body":"Olá {{nome}}, sentimos sua falta hoje. Vamos reagendar?"}}]'::jsonb,
    100, 1440, 'system'
  )
) AS v(id, organization_id, nome, descricao, ativo, gatilho_tipo, gatilho_config, condicoes, acoes, prioridade, cooldown_minutes, created_by)
ON CONFLICT (id) DO NOTHING;

COMMIT;
