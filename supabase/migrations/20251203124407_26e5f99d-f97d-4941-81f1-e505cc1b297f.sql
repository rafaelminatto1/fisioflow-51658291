-- =====================================================
-- ANALYTICS E MÉTRICAS AVANÇADAS
-- =====================================================

-- Tabela de métricas diárias (agregados)
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Pacientes
  total_patients INTEGER DEFAULT 0,
  active_patients INTEGER DEFAULT 0,
  inactive_patients INTEGER DEFAULT 0,
  new_patients INTEGER DEFAULT 0,
  
  -- Sessões
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  
  -- Financeiro
  total_revenue DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  pending_amount DECIMAL(12,2) DEFAULT 0,
  packages_sold INTEGER DEFAULT 0,
  
  -- Sessões de pacotes
  sessions_available INTEGER DEFAULT 0,
  sessions_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(metric_date, organization_id)
);

-- Tabela de OTP para MFA por email
CREATE TABLE IF NOT EXISTS public.mfa_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de solicitações de anonimização (LGPD)
CREATE TABLE IF NOT EXISTS public.data_anonymization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'pending',
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- View para resumo de pacientes ativos/inativos (usando campo status existente)
CREATE OR REPLACE VIEW public.patient_activity_summary AS
SELECT 
  p.id,
  p.name,
  p.organization_id,
  p.created_at,
  p.status,
  (
    SELECT MAX(appointment_date) 
    FROM public.appointments a 
    WHERE a.patient_id = p.id
  ) as last_appointment_date,
  (
    SELECT COUNT(*) 
    FROM public.appointments a 
    WHERE a.patient_id = p.id 
    AND a.status = 'completed'
  ) as total_completed_sessions,
  (
    SELECT COALESCE(SUM(sp.remaining_sessions), 0)
    FROM public.session_packages sp
    WHERE sp.patient_id = p.id
    AND sp.status = 'ativo'
  ) as sessions_available,
  CASE 
    WHEN (
      SELECT MAX(appointment_date) 
      FROM public.appointments a 
      WHERE a.patient_id = p.id
    ) >= CURRENT_DATE - INTERVAL '30 days' THEN 'active'
    WHEN (
      SELECT MAX(appointment_date) 
      FROM public.appointments a 
      WHERE a.patient_id = p.id
    ) >= CURRENT_DATE - INTERVAL '90 days' THEN 'inactive'
    ELSE 'dormant'
  END as activity_status
FROM public.patients p;

-- View para métricas financeiras
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT 
  DATE_TRUNC('month', a.appointment_date)::DATE as month,
  a.organization_id,
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE a.payment_status = 'paid') as paid_appointments,
  COALESCE(SUM(a.payment_amount) FILTER (WHERE a.payment_status = 'paid'), 0) as total_revenue,
  COALESCE(SUM(a.payment_amount) FILTER (WHERE a.payment_status = 'pending'), 0) as pending_revenue,
  COUNT(DISTINCT a.patient_id) as unique_patients
FROM public.appointments a
WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', a.appointment_date), a.organization_id
ORDER BY month DESC;

-- View para novos pacientes por período
CREATE OR REPLACE VIEW public.new_patients_by_period AS
SELECT 
  DATE_TRUNC('week', created_at)::DATE as week_start,
  organization_id,
  COUNT(*) as new_patients
FROM public.patients
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('week', created_at), organization_id
ORDER BY week_start DESC;

-- Função para gerar OTP de MFA
CREATE OR REPLACE FUNCTION public.generate_mfa_otp(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _code TEXT;
BEGIN
  -- Gerar código de 6 dígitos
  _code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Invalidar códigos anteriores
  UPDATE public.mfa_otp_codes
  SET used_at = now()
  WHERE user_id = _user_id AND used_at IS NULL;
  
  -- Inserir novo código (válido por 10 minutos)
  INSERT INTO public.mfa_otp_codes (user_id, code, expires_at)
  VALUES (_user_id, _code, now() + INTERVAL '10 minutes');
  
  RETURN _code;
END;
$$;

-- Função para verificar OTP de MFA
CREATE OR REPLACE FUNCTION public.verify_mfa_otp(_user_id UUID, _code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.mfa_otp_codes
    WHERE user_id = _user_id
    AND code = _code
    AND expires_at > now()
    AND used_at IS NULL
  ) INTO _valid;
  
  IF _valid THEN
    UPDATE public.mfa_otp_codes
    SET used_at = now()
    WHERE user_id = _user_id AND code = _code;
    
    UPDATE public.mfa_settings
    SET last_used_at = now()
    WHERE user_id = _user_id;
  END IF;
  
  RETURN _valid;
END;
$$;

-- Habilitar RLS
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_anonymization_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins e fisios podem ver métricas" ON public.daily_metrics
  FOR SELECT USING (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

CREATE POLICY "Usuários podem ver seus OTPs" ON public.mfa_otp_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir OTPs" ON public.mfa_otp_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar OTPs" ON public.mfa_otp_codes
  FOR UPDATE USING (true);

CREATE POLICY "Usuários podem ver suas solicitações" ON public.data_anonymization_requests
  FOR SELECT USING (auth.uid() = user_id OR public.user_is_admin(auth.uid()));

CREATE POLICY "Usuários podem criar solicitações" ON public.data_anonymization_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem atualizar solicitações" ON public.data_anonymization_requests
  FOR UPDATE USING (public.user_is_admin(auth.uid()));