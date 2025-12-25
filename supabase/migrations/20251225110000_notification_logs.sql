-- =====================================================
-- FisioFlow v3.0 - Logs de Notificações
-- Criado em: 25/12/2025
-- =====================================================

-- Tabela de logs de notificações
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  recipient_id UUID,
  recipient_phone TEXT,
  recipient_email TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channels TEXT[] DEFAULT '{}',
  success BOOLEAN DEFAULT false,
  results JSONB,
  failed_channels TEXT[] DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_success ON notification_logs(success);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's notification logs" ON notification_logs
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Função para limpar logs antigos (mais de 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela para fila de notificações pendentes
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE notification_logs IS 'Histórico de todas as notificações enviadas';
COMMENT ON TABLE notification_queue IS 'Fila de notificações pendentes para processamento assíncrono';


