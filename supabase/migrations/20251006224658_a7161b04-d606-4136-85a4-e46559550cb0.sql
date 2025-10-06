-- ============================================
-- FASE 4: AUDITORIA E MONITORAMENTO
-- ============================================

-- 1. Criar tabela de audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem visualizar logs de auditoria
CREATE POLICY "Admins can view audit logs"
ON public.audit_log FOR SELECT
USING (public.user_is_admin(auth.uid()));

-- Criar índices para performance
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);

-- 2. Função para registrar eventos de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _table_name text,
  _record_id uuid,
  _old_data jsonb DEFAULT NULL,
  _new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    _action,
    _table_name,
    _record_id,
    _old_data,
    _new_data
  );
END;
$$;

-- 3. Trigger para logar mudanças em user_roles
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.log_audit_event(
      'ROLE_DELETED',
      'user_roles',
      OLD.id,
      row_to_json(OLD)::jsonb,
      NULL
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.log_audit_event(
      'ROLE_UPDATED',
      'user_roles',
      NEW.id,
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    PERFORM public.log_audit_event(
      'ROLE_CREATED',
      'user_roles',
      NEW.id,
      NULL,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  END IF;
END;
$$;

-- Aplicar trigger em user_roles
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_changes();

-- 4. Tabela de convites para novos usuários
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role app_role NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar convites
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations FOR ALL
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

-- Qualquer um pode visualizar convite pelo token (para validação)
CREATE POLICY "Anyone can view invitation by token"
ON public.user_invitations FOR SELECT
USING (true);

-- Criar índice
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_expires_at ON public.user_invitations(expires_at);

-- 5. Função para criar convite
CREATE OR REPLACE FUNCTION public.create_user_invitation(
  _email text,
  _role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
  _invitation_id uuid;
  _expires_at timestamptz;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar convites';
  END IF;

  -- Gerar token único
  _token := encode(gen_random_bytes(32), 'hex');
  
  -- Convite válido por 7 dias
  _expires_at := now() + interval '7 days';
  
  -- Inserir convite
  INSERT INTO public.user_invitations (email, role, token, invited_by, expires_at)
  VALUES (_email, _role, _token, auth.uid(), _expires_at)
  RETURNING id INTO _invitation_id;
  
  -- Logar auditoria
  PERFORM public.log_audit_event(
    'INVITATION_CREATED',
    'user_invitations',
    _invitation_id,
    NULL,
    jsonb_build_object('email', _email, 'role', _role)
  );
  
  RETURN jsonb_build_object(
    'id', _invitation_id,
    'token', _token,
    'expires_at', _expires_at
  );
END;
$$;

-- 6. Função para validar e usar convite
CREATE OR REPLACE FUNCTION public.validate_invitation(
  _token text,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Buscar convite
  SELECT * INTO _invitation
  FROM public.user_invitations
  WHERE token = _token
    AND used_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Marcar convite como usado
  UPDATE public.user_invitations
  SET used_at = now()
  WHERE id = _invitation.id;
  
  -- Atribuir role ao usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _invitation.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Logar auditoria
  PERFORM public.log_audit_event(
    'INVITATION_USED',
    'user_invitations',
    _invitation.id,
    NULL,
    jsonb_build_object('user_id', _user_id, 'role', _invitation.role)
  );
  
  RETURN true;
END;
$$;

-- 7. View para monitoramento de segurança
CREATE OR REPLACE VIEW public.security_events AS
SELECT 
  al.id,
  al.timestamp,
  al.action,
  al.table_name,
  p.full_name as user_name,
  p.email as user_email,
  al.old_data,
  al.new_data
FROM public.audit_log al
LEFT JOIN public.profiles p ON p.user_id = al.user_id
WHERE al.action LIKE '%ROLE%' OR al.action LIKE '%INVITATION%'
ORDER BY al.timestamp DESC;

-- Admins podem ver eventos de segurança
GRANT SELECT ON public.security_events TO authenticated;

-- 8. Adicionar comentários
COMMENT ON TABLE public.audit_log IS 'Registro de auditoria de todas as ações críticas do sistema';
COMMENT ON TABLE public.user_invitations IS 'Convites para novos usuários com roles específicos';
COMMENT ON FUNCTION public.create_user_invitation IS 'Cria convite para novo usuário com role específico (admin only)';
COMMENT ON FUNCTION public.validate_invitation IS 'Valida e utiliza convite, atribuindo role ao usuário';
COMMENT ON VIEW public.security_events IS 'View para monitoramento de eventos de segurança (mudanças de roles e convites)';