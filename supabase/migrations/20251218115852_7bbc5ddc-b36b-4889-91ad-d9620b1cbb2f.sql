-- =====================================================
-- FASE 1: Link de Pré-cadastro
-- =====================================================

-- Tabela para tokens de pré-cadastro
CREATE TABLE IF NOT EXISTS public.precadastro_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  nome TEXT,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  validade_dias INTEGER DEFAULT 30,
  max_usos INTEGER DEFAULT NULL, -- null = ilimitado
  usos_atuais INTEGER DEFAULT 0,
  campos_obrigatorios JSONB DEFAULT '["nome", "email", "telefone"]'::jsonb,
  campos_opcionais JSONB DEFAULT '["data_nascimento", "endereco"]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- Pré-cadastros recebidos
CREATE TABLE IF NOT EXISTS public.precadastros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.precadastro_tokens(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  endereco TEXT,
  observacoes TEXT,
  dados_adicionais JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'convertido')),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL, -- quando convertido
  processado_por UUID REFERENCES auth.users(id),
  processado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- FASE 2: Stripe Integração Completa
-- =====================================================

-- Compras de vouchers via Stripe
CREATE TABLE IF NOT EXISTS public.stripe_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- em centavos
  currency TEXT DEFAULT 'brl',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_method TEXT,
  receipt_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- FASE 3: Telemedicina
-- =====================================================

-- Salas de telemedicina
CREATE TABLE IF NOT EXISTS public.telemedicine_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id),
  room_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  room_url TEXT,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'ativo', 'encerrado', 'cancelado')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  recording_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- FASE 4: Onboarding
-- =====================================================

-- Progresso do onboarding por usuário
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  current_step TEXT DEFAULT 'welcome',
  skipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tour_shown BOOLEAN DEFAULT false,
  first_patient_added BOOLEAN DEFAULT false,
  first_appointment_created BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- FASE 5: Push Notifications
-- =====================================================

-- Subscriptions para push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Notificações enviadas
CREATE TABLE IF NOT EXISTS public.push_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

-- Precadastro tokens
ALTER TABLE public.precadastro_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active tokens" ON public.precadastro_tokens;
CREATE POLICY "Public can read active tokens" ON public.precadastro_tokens
  FOR SELECT USING (ativo = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Org members can manage tokens" ON public.precadastro_tokens;
CREATE POLICY "Org members can manage tokens" ON public.precadastro_tokens
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Precadastros
ALTER TABLE public.precadastros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert precadastros" ON public.precadastros;
CREATE POLICY "Anyone can insert precadastros" ON public.precadastros
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Org members can view precadastros" ON public.precadastros;
CREATE POLICY "Org members can view precadastros" ON public.precadastros
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can update precadastros" ON public.precadastros;
CREATE POLICY "Org members can update precadastros" ON public.precadastros
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Stripe purchases
ALTER TABLE public.stripe_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchases" ON public.stripe_purchases;
CREATE POLICY "Users can view own purchases" ON public.stripe_purchases
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org members can view all purchases" ON public.stripe_purchases;
CREATE POLICY "Org members can view all purchases" ON public.stripe_purchases
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Telemedicine rooms
ALTER TABLE public.telemedicine_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage rooms" ON public.telemedicine_rooms;
CREATE POLICY "Org members can manage rooms" ON public.telemedicine_rooms
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Onboarding progress
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own onboarding" ON public.onboarding_progress;
CREATE POLICY "Users manage own onboarding" ON public.onboarding_progress
  FOR ALL USING (user_id = auth.uid());

-- Push subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Push notifications log
ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.push_notifications_log;
CREATE POLICY "Users view own notifications" ON public.push_notifications_log
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- Functions
-- =====================================================

-- Incrementar uso do token de pré-cadastro
CREATE OR REPLACE FUNCTION public.increment_precadastro_token_usage(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _token_id UUID;
  _org_id UUID;
BEGIN
  -- Buscar e validar token
  SELECT id, organization_id INTO _token_id, _org_id
  FROM public.precadastro_tokens
  WHERE token = _token
    AND ativo = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_usos IS NULL OR usos_atuais < max_usos);
  
  IF _token_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Incrementar uso
  UPDATE public.precadastro_tokens
  SET usos_atuais = usos_atuais + 1
  WHERE id = _token_id;
  
  RETURN _org_id;
END;
$$;

-- Triggers para updated_at
CREATE OR REPLACE TRIGGER update_precadastros_updated_at
  BEFORE UPDATE ON public.precadastros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_stripe_purchases_updated_at
  BEFORE UPDATE ON public.stripe_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_telemedicine_rooms_updated_at
  BEFORE UPDATE ON public.telemedicine_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();