-- Criar tabela de templates de notificação
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  tag TEXT,
  require_interaction BOOLEAN DEFAULT false,
  actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ler templates (necessário para edge functions)
DROP POLICY IF EXISTS "Templates são públicos para leitura" ON notification_templates;
CREATE POLICY "Templates são públicos para leitura"
ON notification_templates
FOR SELECT
USING (true);

-- Política: apenas admins podem criar/editar templates
DROP POLICY IF EXISTS "Apenas admins gerenciam templates" ON notification_templates;
CREATE POLICY "Apenas admins gerenciam templates"
ON notification_templates
FOR ALL
USING (user_is_admin(auth.uid()));

-- Inserir templates padrão para agendamentos
INSERT INTO notification_templates (type, title_template, body_template, icon, tag, require_interaction)
VALUES 
  (
    'appointment_created',
    'Agendamento Confirmado',
    'Olá {{patientName}}! Seu agendamento foi confirmado para {{date}} às {{time}}.',
    '/icons/icon-192x192.svg',
    'appointment',
    false
  ),
  (
    'appointment_rescheduled',
    'Agendamento Reagendado',
    'Olá {{patientName}}! Seu agendamento foi reagendado para {{date}} às {{time}}.',
    '/icons/icon-192x192.svg',
    'appointment',
    false
  ),
  (
    'appointment_cancelled',
    'Agendamento Cancelado',
    'Olá {{patientName}}! Seu agendamento de {{date}} às {{time}} foi cancelado.',
    '/icons/icon-192x192.svg',
    'appointment',
    true
  ),
  (
    'appointment_reminder_24h',
    'Lembrete: Consulta Amanhã',
    'Olá {{patientName}}! Lembrete: você tem consulta amanhã às {{time}}.',
    '/icons/icon-192x192.svg',
    'reminder',
    false
  ),
  (
    'appointment_reminder_2h',
    'Lembrete: Consulta em 2 horas',
    'Olá {{patientName}}! Sua consulta será em 2 horas ({{time}}).',
    '/icons/icon-192x192.svg',
    'reminder',
    true
  )
ON CONFLICT (type) DO NOTHING;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();