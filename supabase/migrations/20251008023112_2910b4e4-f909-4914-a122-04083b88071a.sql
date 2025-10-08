-- ====================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS
-- ====================================

-- 1. MELHORAR PROTEÇÃO DA TABELA patients
-- Remover políticas antigas muito permissivas
DROP POLICY IF EXISTS "Therapists can update patients" ON public.patients;
DROP POLICY IF EXISTS "Therapists can view all patients" ON public.patients;

-- Criar função para verificar se usuário tem acesso a paciente específico
CREATE OR REPLACE FUNCTION public.can_view_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admins e fisios podem ver todos
    SELECT 1 WHERE public.user_has_any_role(_user_id, ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    UNION
    -- Estagiários podem ver apenas pacientes de suas sessões
    SELECT 1 
    FROM public.appointments a
    WHERE a.patient_id = _patient_id
      AND a.therapist_id IN (
        SELECT profiles.id 
        FROM profiles 
        WHERE profiles.user_id = _user_id
      )
    UNION
    -- Paciente pode ver seus próprios dados
    SELECT 1
    FROM public.patients p
    JOIN public.profiles pr ON pr.id = p.profile_id
    WHERE p.id = _patient_id AND pr.user_id = _user_id
  )
$$;

-- Política de visualização mais restritiva
CREATE POLICY "Acesso controlado para visualizar pacientes"
ON public.patients
FOR SELECT
TO authenticated
USING (public.can_view_patient(auth.uid(), id));

-- Apenas admins e fisios podem atualizar dados sensíveis
CREATE POLICY "Apenas admins e fisios podem atualizar pacientes"
ON public.patients
FOR UPDATE
TO authenticated
USING (public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
WITH CHECK (public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- 2. PROTEGER DADOS SENSÍVEIS NA TABELA profiles
-- Remover política muito aberta
DROP POLICY IF EXISTS "Therapists can view patient profiles" ON public.profiles;

-- Criar função para acesso controlado a perfis
CREATE OR REPLACE FUNCTION public.can_view_profile(_user_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Usuário pode ver seu próprio perfil
    SELECT 1 FROM public.profiles WHERE id = _profile_id AND user_id = _user_id
    UNION
    -- Admins e fisios podem ver perfis de seus pacientes
    SELECT 1
    FROM public.profiles target_profile
    JOIN public.patients p ON p.profile_id = target_profile.id
    WHERE target_profile.id = _profile_id
      AND public.user_has_any_role(_user_id, ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    UNION
    -- Estagiários podem ver apenas perfis de pacientes que atendem
    SELECT 1
    FROM public.profiles target_profile
    JOIN public.patients p ON p.profile_id = target_profile.id
    JOIN public.appointments a ON a.patient_id = p.id
    JOIN public.profiles therapist_profile ON therapist_profile.id = a.therapist_id
    WHERE target_profile.id = _profile_id
      AND therapist_profile.user_id = _user_id
      AND public.has_role(_user_id, 'estagiario'::app_role)
  )
$$;

-- Aplicar política restritiva
CREATE POLICY "Acesso controlado a perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), id));

-- 3. ADICIONAR AUDITORIA para operações sensíveis em patients
CREATE OR REPLACE FUNCTION public.audit_patient_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar acesso a dados sensíveis de pacientes
  IF (TG_OP = 'UPDATE' AND (
    OLD.cpf IS DISTINCT FROM NEW.cpf OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.health_insurance IS DISTINCT FROM NEW.health_insurance
  )) THEN
    PERFORM public.log_audit_event(
      'SENSITIVE_PATIENT_DATA_UPDATED',
      'patients',
      NEW.id,
      jsonb_build_object(
        'cpf_changed', OLD.cpf IS DISTINCT FROM NEW.cpf,
        'email_changed', OLD.email IS DISTINCT FROM NEW.email,
        'phone_changed', OLD.phone IS DISTINCT FROM NEW.phone,
        'insurance_changed', OLD.health_insurance IS DISTINCT FROM NEW.health_insurance
      ),
      jsonb_build_object('patient_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_sensitive_patient_changes ON public.patients;

CREATE TRIGGER audit_sensitive_patient_changes
  AFTER UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_patient_access();

-- 4. POLÍTICAS RLS PARA audit_log (tabela base, não a view)
-- Apenas admins podem visualizar logs de auditoria
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;

CREATE POLICY "Admins podem visualizar logs de auditoria"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- 5. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON POLICY "Acesso controlado para visualizar pacientes" ON public.patients IS 
'Política LGPD-compliant: admins e fisios veem todos; estagiários apenas pacientes que atendem; pacientes veem só próprios dados';

COMMENT ON POLICY "Admins podem visualizar logs de auditoria" ON public.audit_log IS 
'Proteção de logs de auditoria: apenas administradores podem visualizar eventos de segurança';

COMMENT ON FUNCTION public.can_view_patient IS 
'Função de segurança para controlar acesso a dados sensíveis de pacientes conforme LGPD';

COMMENT ON FUNCTION public.can_view_profile IS
'Função de segurança para controlar acesso a dados de perfis conforme LGPD';