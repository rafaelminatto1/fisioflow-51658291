-- Email Templates Table
CREATE TABLE email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables TEXT[] DEFAULT '{}',
  type VARCHAR(50) NOT NULL CHECK (type IN ('appointment_reminder', 'appointment_confirmation', 'exercise_reminder', 'progress_report', 'custom')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Notifications Table
CREATE TABLE email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'scheduled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Configuration Table
CREATE TABLE email_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('resend', 'sendgrid')),
  api_key VARCHAR(500) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  reply_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Queue Table (for processing)
CREATE TABLE email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES email_notifications(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_templates_type ON email_templates(type);
CREATE INDEX idx_email_notifications_patient ON email_notifications(patient_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_scheduled ON email_notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_email_queue_next_attempt ON email_queue(next_attempt);
CREATE INDEX idx_email_queue_priority ON email_queue(priority DESC);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Email Templates: Authenticated users can read and manage
CREATE POLICY "Authenticated users can view email templates" ON email_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage email templates" ON email_templates
  FOR ALL TO authenticated USING (true);

-- Email Notifications: Users can only see notifications for their patients
CREATE POLICY "Users can view their email notifications" ON email_notifications
  FOR SELECT TO authenticated USING (
    patient_id IN (
      SELECT id FROM patients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their email notifications" ON email_notifications
  FOR ALL TO authenticated USING (
    patient_id IN (
      SELECT id FROM patients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Email Config: Only authenticated users can manage
CREATE POLICY "Authenticated users can manage email config" ON email_config
  FOR ALL TO authenticated USING (true);

-- Email Queue: System access only
CREATE POLICY "System can manage email queue" ON email_queue
  FOR ALL TO authenticated USING (true);

-- Functions

-- Function to get email statistics
CREATE OR REPLACE FUNCTION get_email_stats()
RETURNS TABLE (
  total_sent BIGINT,
  total_failed BIGINT,
  total_pending BIGINT,
  total_scheduled BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
    COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
    COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
    COUNT(*) FILTER (WHERE status = 'scheduled') as total_scheduled,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'sent')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as success_rate
  FROM email_notifications
  WHERE created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process email queue
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS TABLE (
  notification_id UUID,
  recipient_email VARCHAR,
  subject VARCHAR,
  content TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    en.id,
    en.recipient_email,
    en.subject,
    en.content
  FROM email_notifications en
  JOIN email_queue eq ON en.id = eq.notification_id
  WHERE en.status = 'pending'
    AND eq.next_attempt <= NOW()
    AND eq.attempts < eq.max_attempts
  ORDER BY eq.priority DESC, eq.created_at ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification status
CREATE OR REPLACE FUNCTION update_notification_status(
  p_notification_id UUID,
  p_status VARCHAR,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE email_notifications 
  SET 
    status = p_status,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_notification_id;
  
  -- Update queue attempts
  IF p_status = 'failed' THEN
    UPDATE email_queue 
    SET 
      attempts = attempts + 1,
      next_attempt = NOW() + INTERVAL '1 hour' * attempts
    WHERE notification_id = p_notification_id;
  ELSE
    DELETE FROM email_queue WHERE notification_id = p_notification_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add notifications to queue
CREATE OR REPLACE FUNCTION add_to_email_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO email_queue (notification_id, priority)
    VALUES (NEW.id, CASE NEW.template_id 
      WHEN (SELECT id FROM email_templates WHERE type = 'appointment_reminder') THEN 1
      WHEN (SELECT id FROM email_templates WHERE type = 'appointment_confirmation') THEN 2
      ELSE 5
    END);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_to_email_queue
  AFTER INSERT ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION add_to_email_queue();

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables, type) VALUES
(
  'Lembrete de Consulta',
  'Lembrete: Consulta agendada para {{appointment_date}}',
  '<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Lembrete de Consulta</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .footer { padding: 20px; text-align: center; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>FisioFlow</h1>
      </div>
      <div class="content">
        <h2>Olá, {{patient_name}}!</h2>
        <p>Este é um lembrete da sua consulta agendada:</p>
        <ul>
          <li><strong>Data:</strong> {{appointment_date}}</li>
          <li><strong>Horário:</strong> {{appointment_time}}</li>
          <li><strong>Fisioterapeuta:</strong> {{therapist_name}}</li>
        </ul>
        <p>Por favor, chegue com 10 minutos de antecedência.</p>
        <p>Em caso de necessidade de reagendamento, entre em contato conosco.</p>
      </div>
      <div class="footer">
        <p>FisioFlow - Sistema de Gestão Fisioterapêutica</p>
      </div>
    </div>
  </body>
  </html>',
  'Olá {{patient_name}}! Este é um lembrete da sua consulta agendada para {{appointment_date}} às {{appointment_time}} com {{therapist_name}}. Por favor, chegue com 10 minutos de antecedência.',
  ARRAY['patient_name', 'appointment_date', 'appointment_time', 'therapist_name'],
  'appointment_reminder'
),
(
  'Confirmação de Agendamento',
  'Consulta confirmada para {{appointment_date}}',
  '<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Confirmação de Agendamento</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #10b981; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .footer { padding: 20px; text-align: center; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>✓ Consulta Confirmada</h1>
      </div>
      <div class="content">
        <h2>Olá, {{patient_name}}!</h2>
        <p>Sua consulta foi confirmada com sucesso:</p>
        <ul>
          <li><strong>Data:</strong> {{appointment_date}}</li>
          <li><strong>Horário:</strong> {{appointment_time}}</li>
          <li><strong>Fisioterapeuta:</strong> {{therapist_name}}</li>
          <li><strong>Tipo:</strong> {{appointment_type}}</li>
        </ul>
        <p>Aguardamos você na data e horário marcados.</p>
      </div>
      <div class="footer">
        <p>FisioFlow - Sistema de Gestão Fisioterapêutica</p>
      </div>
    </div>
  </body>
  </html>',
  'Olá {{patient_name}}! Sua consulta foi confirmada para {{appointment_date}} às {{appointment_time}} com {{therapist_name}}.',
  ARRAY['patient_name', 'appointment_date', 'appointment_time', 'therapist_name', 'appointment_type'],
  'appointment_confirmation'
),
(
  'Lembrete de Exercícios',
  'Não esqueça dos seus exercícios de hoje!',
  '<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Lembrete de Exercícios</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .footer { padding: 20px; text-align: center; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>💪 Hora dos Exercícios!</h1>
      </div>
      <div class="content">
        <h2>Olá, {{patient_name}}!</h2>
        <p>Este é um lembrete para realizar seus exercícios de hoje.</p>
        <p><strong>Plano:</strong> {{plan_name}}</p>
        <p>Lembre-se de que a consistência é fundamental para sua recuperação.</p>
        <p>Acesse o sistema para registrar seu progresso após completar os exercícios.</p>
      </div>
      <div class="footer">
        <p>FisioFlow - Sistema de Gestão Fisioterapêutica</p>
      </div>
    </div>
  </body>
  </html>',
  'Olá {{patient_name}}! Lembrete para realizar seus exercícios do plano {{plan_name}}. A consistência é fundamental para sua recuperação!',
  ARRAY['patient_name', 'plan_name'],
  'exercise_reminder'
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION process_email_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_status(UUID, VARCHAR, TEXT) TO authenticated;