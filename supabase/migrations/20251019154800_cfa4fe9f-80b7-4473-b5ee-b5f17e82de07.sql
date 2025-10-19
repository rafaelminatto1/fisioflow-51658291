-- ============================================
-- SECURITY FIXES - Critical Issues Only
-- ============================================

-- ============================================
-- 1. FIX: Voucher Update Policy (CRITICAL)
-- Remove overly permissive policy and replace with restricted access
-- ============================================

-- Drop the dangerous policy that allows anyone to update vouchers
DROP POLICY IF EXISTS "Sistema pode atualizar vouchers" ON user_vouchers;

-- Create security definer function to authorize voucher updates
CREATE OR REPLACE FUNCTION public.is_voucher_operation_authorized()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only service role or admin can update vouchers
  SELECT (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR public.user_is_admin(auth.uid())
  )
$$;

-- Create restricted policy for voucher updates
CREATE POLICY "Apenas admin ou serviço pode atualizar vouchers"
ON user_vouchers FOR UPDATE
USING (public.is_voucher_operation_authorized())
WITH CHECK (public.is_voucher_operation_authorized());

-- ============================================
-- 2. FIX: Restrict Intern Access to Assigned Patients Only
-- Create assignment table and update RLS policies
-- ============================================

-- Create table to track which interns are assigned to which patients
CREATE TABLE IF NOT EXISTS public.estagiario_paciente_atribuicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estagiario_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  supervisor_id uuid REFERENCES profiles(id), -- Fisioterapeuta responsible
  data_atribuicao timestamp with time zone NOT NULL DEFAULT now(),
  data_expiracao timestamp with time zone, -- Optional expiration
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(estagiario_user_id, patient_id)
);

-- Enable RLS on assignment table
ALTER TABLE public.estagiario_paciente_atribuicao ENABLE ROW LEVEL SECURITY;

-- Only admins and fisios can manage assignments
CREATE POLICY "Admins e fisios gerenciam atribuições"
ON estagiario_paciente_atribuicao FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Interns can view their own assignments
CREATE POLICY "Estagiários veem suas atribuições"
ON estagiario_paciente_atribuicao FOR SELECT
USING (auth.uid() = estagiario_user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_estagiario_atribuicao_user ON estagiario_paciente_atribuicao(estagiario_user_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_estagiario_atribuicao_patient ON estagiario_paciente_atribuicao(patient_id) WHERE ativo = true;

-- Create helper function to check if intern can access patient
CREATE OR REPLACE FUNCTION public.estagiario_pode_acessar_paciente(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.estagiario_paciente_atribuicao
    WHERE estagiario_user_id = _user_id
      AND patient_id = _patient_id
      AND ativo = true
      AND (data_expiracao IS NULL OR data_expiracao > now())
  )
$$;

-- Update existing policies to restrict intern access

-- Drop old permissive policies and replace with restricted ones
DROP POLICY IF EXISTS "Therapists can manage appointments" ON appointments;
CREATE POLICY "Admins e fisios gerenciam agendamentos"
ON appointments FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários gerenciam agendamentos de pacientes atribuídos"
ON appointments FOR ALL
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

-- Medical Records: Restrict intern access
DROP POLICY IF EXISTS "Therapists can manage medical records" ON medical_records;
CREATE POLICY "Admins e fisios gerenciam prontuários"
ON medical_records FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários acessam prontuários de pacientes atribuídos"
ON medical_records FOR SELECT
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

CREATE POLICY "Estagiários criam prontuários de pacientes atribuídos"
ON medical_records FOR INSERT
WITH CHECK (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

CREATE POLICY "Estagiários atualizam prontuários de pacientes atribuídos"
ON medical_records FOR UPDATE
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

-- SOAP Records: Restrict intern access
DROP POLICY IF EXISTS "Therapists can create soap records" ON soap_records;
DROP POLICY IF EXISTS "Therapists can update unsigned soap records" ON soap_records;

CREATE POLICY "Admins e fisios gerenciam registros SOAP"
ON soap_records FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários criam SOAP de pacientes atribuídos"
ON soap_records FOR INSERT
WITH CHECK (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

CREATE POLICY "Estagiários atualizam SOAP não-assinados de pacientes atribuídos"
ON soap_records FOR UPDATE
USING (
  signed_at IS NULL
  AND user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

CREATE POLICY "Estagiários veem SOAP de pacientes atribuídos"
ON soap_records FOR SELECT
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

-- Exercise Plans: Restrict intern access
DROP POLICY IF EXISTS "Therapists can manage exercise plans" ON exercise_plans;
CREATE POLICY "Admins e fisios gerenciam planos de exercício"
ON exercise_plans FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários gerenciam planos de pacientes atribuídos"
ON exercise_plans FOR ALL
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

-- Exercise Plan Items: Restrict intern access
DROP POLICY IF EXISTS "Therapists can manage exercise plan items" ON exercise_plan_items;
CREATE POLICY "Admins e fisios gerenciam itens de plano"
ON exercise_plan_items FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários gerenciam itens de pacientes atribuídos"
ON exercise_plan_items FOR ALL
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND plan_id IN (
    SELECT id FROM exercise_plans ep
    WHERE public.estagiario_pode_acessar_paciente(auth.uid(), ep.patient_id)
  )
);

-- Treatment Sessions: Restrict intern access
DROP POLICY IF EXISTS "Therapists can manage treatment sessions" ON treatment_sessions;
CREATE POLICY "Admins e fisios gerenciam sessões"
ON treatment_sessions FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários gerenciam sessões de pacientes atribuídos"
ON treatment_sessions FOR ALL
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

-- Patient Progress: Restrict intern access
DROP POLICY IF EXISTS "Therapists can manage patient progress" ON patient_progress;
CREATE POLICY "Admins e fisios gerenciam progresso"
ON patient_progress FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários gerenciam progresso de pacientes atribuídos"
ON patient_progress FOR ALL
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND public.estagiario_pode_acessar_paciente(auth.uid(), patient_id)
);

-- Reports: Restrict intern access
DROP POLICY IF EXISTS "Therapists can manage reports" ON reports;
CREATE POLICY "Admins e fisios gerenciam relatórios"
ON reports FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Estagiários gerenciam relatórios de pacientes atribuídos"
ON reports FOR ALL
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role)
  AND (patient_id IS NULL OR public.estagiario_pode_acessar_paciente(auth.uid(), patient_id))
);

-- Update can_view_patient function to include intern restrictions
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
    -- Estagiários podem ver apenas pacientes atribuídos
    SELECT 1 
    WHERE public.has_role(_user_id, 'estagiario'::app_role)
      AND public.estagiario_pode_acessar_paciente(_user_id, _patient_id)
    UNION
    -- Paciente pode ver seus próprios dados
    SELECT 1
    FROM public.patients p
    JOIN public.profiles pr ON pr.id = p.profile_id
    WHERE p.id = _patient_id AND pr.user_id = _user_id
  )
$$;

-- Trigger for updated_at on assignment table
CREATE TRIGGER update_estagiario_atribuicao_updated_at
BEFORE UPDATE ON estagiario_paciente_atribuicao
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. FIX: CPF Encryption
-- Implement automatic CPF encryption via triggers
-- ============================================

-- Improved encryption function that handles both encryption and hashing
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt CPF if present and not already encrypted
  -- Store hash for searching, not the actual encrypted value
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    -- Only hash if not already hashed (simple check for hex format)
    IF NEW.cpf !~ '^[a-f0-9]{64}$' THEN
      NEW.cpf := encode(digest(NEW.cpf, 'sha256'), 'hex');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for patients table
DROP TRIGGER IF EXISTS encrypt_patient_cpf_trigger ON patients;
CREATE TRIGGER encrypt_patient_cpf_trigger
BEFORE INSERT OR UPDATE OF cpf ON patients
FOR EACH ROW
WHEN (NEW.cpf IS NOT NULL AND NEW.cpf != '')
EXECUTE FUNCTION encrypt_sensitive_data();

-- Create triggers for prestadores table (if they have CPF/CNPJ)
DROP TRIGGER IF EXISTS encrypt_prestador_cpf_trigger ON prestadores;
CREATE TRIGGER encrypt_prestador_cpf_trigger
BEFORE INSERT OR UPDATE OF cpf_cnpj ON prestadores
FOR EACH ROW
WHEN (NEW.cpf_cnpj IS NOT NULL AND NEW.cpf_cnpj != '')
EXECUTE FUNCTION encrypt_sensitive_data();

-- Note: Existing CPF data will be hashed on next UPDATE
-- To migrate existing data immediately, run:
-- UPDATE patients SET cpf = cpf WHERE cpf IS NOT NULL AND cpf != '';
-- UPDATE prestadores SET cpf_cnpj = cpf_cnpj WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';

-- Create audit log entry for CPF access
CREATE OR REPLACE FUNCTION public.audit_cpf_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'SELECT' AND OLD.cpf IS NOT NULL) THEN
    PERFORM public.log_audit_event(
      'CPF_ACCESSED',
      TG_TABLE_NAME,
      OLD.id,
      NULL,
      jsonb_build_object('accessed_at', now())
    );
  END IF;
  RETURN OLD;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.is_voucher_operation_authorized() IS 'Security definer function to authorize voucher operations - only service role or admin';
COMMENT ON FUNCTION public.estagiario_pode_acessar_paciente(_user_id uuid, _patient_id uuid) IS 'Checks if intern has been assigned to a specific patient';
COMMENT ON TABLE public.estagiario_paciente_atribuicao IS 'Tracks which interns are assigned to which patients for access control';
COMMENT ON FUNCTION public.encrypt_sensitive_data() IS 'Automatically hashes CPF/CNPJ data before storage for LGPD compliance';

-- Log security improvements in audit log
DO $$
BEGIN
  PERFORM public.log_audit_event(
    'SECURITY_IMPROVEMENTS_APPLIED',
    'system',
    gen_random_uuid(),
    NULL,
    jsonb_build_object(
      'fixes', ARRAY[
        'voucher_policy_restricted',
        'intern_access_restricted',
        'cpf_encryption_enabled'
      ],
      'timestamp', now()
    )
  );
END $$;