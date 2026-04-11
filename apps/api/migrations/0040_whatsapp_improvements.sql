-- Automações WhatsApp com persistência real
CREATE TABLE IF NOT EXISTS wa_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'message_received', 'conversation_created', 'status_changed',
    'keyword_match', 'no_response', 'first_contact'
  )),
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  team VARCHAR(100),
  created_by VARCHAR(255),
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_automation_rules_org ON wa_automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_automation_rules_org_active ON wa_automation_rules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wa_automation_rules_trigger ON wa_automation_rules(trigger_type, is_active);

-- Adicionar suporte a snooze nas conversas
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_wa_conversations_snoozed ON wa_conversations(snoozed_until) WHERE snoozed_until IS NOT NULL;
