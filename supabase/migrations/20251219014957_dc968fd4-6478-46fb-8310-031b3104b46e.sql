-- Create WhatsApp templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  template_key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'utility',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp metrics table
CREATE TABLE IF NOT EXISTS public.whatsapp_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  message_id TEXT,
  phone_number TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id),
  appointment_id UUID REFERENCES public.appointments(id),
  template_key TEXT,
  message_type TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'pendente',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  reply_content TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp webhook logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  phone_number TEXT,
  message_content TEXT,
  message_id TEXT,
  raw_payload JSONB,
  processed BOOLEAN DEFAULT false,
  processing_result TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Admins and fisios can view templates" ON public.whatsapp_templates
  FOR SELECT USING (public.user_is_fisio_or_admin(auth.uid()));

CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- RLS Policies for metrics
CREATE POLICY "Admins and fisios can view metrics" ON public.whatsapp_metrics
  FOR SELECT USING (public.user_is_fisio_or_admin(auth.uid()));

CREATE POLICY "System can insert metrics" ON public.whatsapp_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update metrics" ON public.whatsapp_metrics
  FOR UPDATE USING (true);

-- RLS Policies for webhook logs
CREATE POLICY "Admins can view webhook logs" ON public.whatsapp_webhook_logs
  FOR SELECT USING (public.user_is_admin(auth.uid()));

CREATE POLICY "System can insert webhook logs" ON public.whatsapp_webhook_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update webhook logs" ON public.whatsapp_webhook_logs
  FOR UPDATE USING (true);

-- Insert default templates
INSERT INTO public.whatsapp_templates (name, template_key, content, variables, category) VALUES
  ('Confirmação de Agendamento', 'confirmacao_agendamento', 
   'Olá {{name}}, seu agendamento com {{therapist}} em {{date}} às {{time}} foi confirmado!', 
   ARRAY['name', 'therapist', 'date', 'time'], 'utility'),
  ('Lembrete de Sessão', 'lembrete_sessao', 
   'Lembrete: Você tem sessão amanhã às {{time}} com {{therapist}} em Activity Fisioterapia', 
   ARRAY['time', 'therapist'], 'utility'),
  ('Cancelamento', 'cancelamento', 
   'Seu agendamento de {{date}} foi cancelado. Entre em contato conosco!', 
   ARRAY['date'], 'utility'),
  ('Prescrição Disponível', 'prescricao', 
   'Sua prescrição está pronta! Clique aqui para visualizar: {{link}}', 
   ARRAY['link'], 'utility'),
  ('Resultado de Exame', 'resultado_exame', 
   'Seus resultados de exame estão disponíveis. Acesse: {{link}}', 
   ARRAY['link'], 'utility'),
  ('Confirmação Solicitada', 'solicitar_confirmacao',
   'Olá {{name}}! Confirme sua sessão de {{date}} às {{time}} respondendo SIM ou NÃO.',
   ARRAY['name', 'date', 'time'], 'utility')
ON CONFLICT (template_key) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_metrics_status ON public.whatsapp_metrics(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_metrics_patient ON public.whatsapp_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_metrics_appointment ON public.whatsapp_metrics(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_metrics_created ON public.whatsapp_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_created ON public.whatsapp_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_processed ON public.whatsapp_webhook_logs(processed);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();