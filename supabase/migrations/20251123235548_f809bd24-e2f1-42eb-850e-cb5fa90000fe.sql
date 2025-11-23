-- ====================================
-- FASE 1: SEGURANÇA & COMPLIANCE LGPD
-- ====================================

-- 1. Tabela de Consentimentos LGPD
CREATE TABLE IF NOT EXISTS public.lgpd_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('dados_pessoais', 'dados_sensiveis', 'comunicacao_marketing', 'compartilhamento_terceiros')),
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- 2. Tabela de Solicitações de Dados (Direito de Portabilidade)
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion')),
  data_package_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Configurações MFA
CREATE TABLE IF NOT EXISTS public.mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_method TEXT CHECK (mfa_method IN ('totp', 'sms', 'email')),
  backup_codes TEXT[], -- Códigos de backup criptografados
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabela de Eventos de Segurança (renomear para evitar conflito)
CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'mfa_enabled', 'mfa_disabled', 'mfa_failed', 
    'password_changed', 'suspicious_login', 
    'data_export_requested', 'consent_granted', 'consent_revoked'
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_lgpd_consents_user_id ON public.lgpd_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON public.data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON public.data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_security_audit_events_user_id ON public.security_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_events_created_at ON public.security_audit_events(created_at DESC);

-- 6. Triggers para updated_at
CREATE TRIGGER update_lgpd_consents_updated_at
  BEFORE UPDATE ON public.lgpd_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_export_requests_updated_at
  BEFORE UPDATE ON public.data_export_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mfa_settings_updated_at
  BEFORE UPDATE ON public.mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS Policies - LGPD Consents
ALTER TABLE public.lgpd_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios consentimentos"
  ON public.lgpd_consents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus consentimentos"
  ON public.lgpd_consents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar consentimentos"
  ON public.lgpd_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins veem todos os consentimentos"
  ON public.lgpd_consents FOR SELECT
  USING (public.user_is_admin(auth.uid()));

-- 8. RLS Policies - Data Export Requests
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas solicitações"
  ON public.data_export_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar solicitações"
  ON public.data_export_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins gerenciam todas as solicitações"
  ON public.data_export_requests FOR ALL
  USING (public.user_is_admin(auth.uid()));

-- 9. RLS Policies - MFA Settings
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seu próprio MFA"
  ON public.mfa_settings FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins veem configurações MFA"
  ON public.mfa_settings FOR SELECT
  USING (public.user_is_admin(auth.uid()));

-- 10. RLS Policies - Security Audit Events
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus eventos"
  ON public.security_audit_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Sistema cria eventos de segurança"
  ON public.security_audit_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins veem todos os eventos"
  ON public.security_audit_events FOR SELECT
  USING (public.user_is_admin(auth.uid()));

-- 11. Função para registrar evento de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(
  _user_id UUID,
  _event_type TEXT,
  _severity TEXT DEFAULT 'info',
  _metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id UUID;
BEGIN
  INSERT INTO public.security_audit_events (
    user_id,
    event_type,
    severity,
    metadata
  ) VALUES (
    _user_id,
    _event_type,
    _severity,
    _metadata
  )
  RETURNING id INTO _event_id;
  
  RETURN _event_id;
END;
$$;

-- 12. Função para solicitar exportação de dados (LGPD Portabilidade)
CREATE OR REPLACE FUNCTION public.request_data_export(_user_id UUID, _request_type TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request_id UUID;
BEGIN
  -- Verificar se usuário pode fazer a solicitação
  IF auth.uid() != _user_id AND NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  -- Criar solicitação
  INSERT INTO public.data_export_requests (user_id, request_type)
  VALUES (_user_id, _request_type)
  RETURNING id INTO _request_id;
  
  -- Registrar evento de segurança
  PERFORM public.log_security_event(
    _user_id,
    'data_export_requested',
    'info',
    jsonb_build_object('request_type', _request_type, 'request_id', _request_id)
  );
  
  RETURN _request_id;
END;
$$;

-- 13. Função para gerenciar consentimento
CREATE OR REPLACE FUNCTION public.manage_consent(
  _user_id UUID,
  _consent_type TEXT,
  _granted BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _consent_id UUID;
BEGIN
  -- Verificar autorização
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  -- Inserir ou atualizar consentimento
  INSERT INTO public.lgpd_consents (
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at
  ) VALUES (
    _user_id,
    _consent_type,
    _granted,
    CASE WHEN _granted THEN now() ELSE NULL END,
    CASE WHEN NOT _granted THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, consent_type) DO UPDATE
  SET
    granted = EXCLUDED.granted,
    granted_at = CASE WHEN EXCLUDED.granted THEN now() ELSE lgpd_consents.granted_at END,
    revoked_at = CASE WHEN NOT EXCLUDED.granted THEN now() ELSE NULL END,
    updated_at = now()
  RETURNING id INTO _consent_id;
  
  -- Registrar evento
  PERFORM public.log_security_event(
    _user_id,
    CASE WHEN _granted THEN 'consent_granted' ELSE 'consent_revoked' END,
    'info',
    jsonb_build_object('consent_type', _consent_type)
  );
  
  RETURN _consent_id;
END;
$$;

-- 14. Comentários nas tabelas
COMMENT ON TABLE public.lgpd_consents IS 'Gerenciamento de consentimentos LGPD dos usuários';
COMMENT ON TABLE public.data_export_requests IS 'Solicitações de portabilidade e exclusão de dados (Art. 18 LGPD)';
COMMENT ON TABLE public.mfa_settings IS 'Configurações de autenticação multi-fator (MFA)';
COMMENT ON TABLE public.security_audit_events IS 'Log de eventos de segurança e auditoria';