-- ============================================
-- FASE 1: CORREÇÃO DA ARQUITETURA DE ROLES
-- ============================================

-- 1. Criar funções security definer para consultar roles
-- Estas funções evitam recursão infinita nas políticas RLS

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.user_is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_role(_user_id, 'admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.user_is_fisio_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_any_role(_user_id, ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
$$;

-- 2. Migrar dados existentes de profiles.role para user_roles (condicionalmente)
DO $$
BEGIN
    -- Verificar se a coluna role existe e migrar dados
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        -- Tentar migrar dados, tratando diferentes tipos de role
        INSERT INTO public.user_roles (user_id, role)
        SELECT 
          p.user_id,
          CASE 
            WHEN p.role::text IN ('admin', 'fisioterapeuta', 'estagiario', 'paciente', 'parceiro') THEN p.role::text::app_role
            ELSE 'paciente'::app_role
          END
        FROM public.profiles p
        WHERE p.user_id IS NOT NULL
          AND p.role IS NOT NULL
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros de cast (migration não é crítica)
        NULL;
END $$;

-- 3. PRIMEIRO: Dropar TODAS as políticas que dependem de profiles.role
DROP POLICY IF EXISTS "Therapists can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;
DROP POLICY IF EXISTS "Therapists can create patients" ON public.patients;
DROP POLICY IF EXISTS "Therapists can update patients" ON public.patients;
DROP POLICY IF EXISTS "Therapists can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Therapists can manage medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Patients can view own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Therapists can view soap records" ON public.soap_records;
DROP POLICY IF EXISTS "Patients can view own soap records" ON public.soap_records;
DROP POLICY IF EXISTS "Therapists can create soap records" ON public.soap_records;
DROP POLICY IF EXISTS "Therapists can update unsigned soap records" ON public.soap_records;
DROP POLICY IF EXISTS "Admins can delete soap records" ON public.soap_records;
DROP POLICY IF EXISTS "All users can view exercises" ON public.exercises;
DROP POLICY IF EXISTS "Therapists can manage exercises" ON public.exercises;
DROP POLICY IF EXISTS "Therapists can manage exercise plans" ON public.exercise_plans;
DROP POLICY IF EXISTS "Patients can view own exercise plans" ON public.exercise_plans;
DROP POLICY IF EXISTS "Therapists can manage exercise plan items" ON public.exercise_plan_items;
DROP POLICY IF EXISTS "Users can view exercise plan items" ON public.exercise_plan_items;
DROP POLICY IF EXISTS "Therapists can manage treatment sessions" ON public.treatment_sessions;
DROP POLICY IF EXISTS "Therapists can manage patient progress" ON public.patient_progress;
DROP POLICY IF EXISTS "Therapists can manage reports" ON public.reports;
DROP POLICY IF EXISTS "Admins e fisios podem ver todos os eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admins e fisios podem criar eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admins e fisios podem atualizar eventos" ON public.eventos;
DROP POLICY IF EXISTS "Apenas admins podem deletar eventos" ON public.eventos;
DROP POLICY IF EXISTS "Acesso a prestadores segue acesso aos eventos" ON public.prestadores;
DROP POLICY IF EXISTS "Acesso ao checklist segue acesso aos eventos" ON public.checklist_items;
DROP POLICY IF EXISTS "Acesso aos participantes segue acesso aos eventos" ON public.participantes;
DROP POLICY IF EXISTS "Apenas admins e fisios acessam pagamentos" ON public.pagamentos;

-- 4. AGORA podemos remover a coluna role da tabela profiles
-- NOTE: Não podemos remover se houver dependências (views, funções, etc.)
-- A coluna será mantida para compatibilidade, mas não será usada nas novas políticas RLS
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 5. Atualizar trigger handle_new_user para criar role em user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (user_id, full_name, email, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    false
  );
  
  -- Criar role padrão 'paciente' (seguro por padrão)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'paciente'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 6. Remover política recursiva antiga de user_roles e criar novas corretas
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Usuários podem ver seus próprios roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Apenas admins podem gerenciar roles (usando security definer)
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

-- 7. Recriar TODAS as políticas usando as novas funções security definer

-- ============================================
-- PROFILES
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- PATIENTS
-- ============================================

CREATE POLICY "Therapists can view all patients"
ON public.patients FOR SELECT
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Patients can view own data"
ON public.patients FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Therapists can create patients"
ON public.patients FOR INSERT
WITH CHECK (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

CREATE POLICY "Therapists can update patients"
ON public.patients FOR UPDATE
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

-- ============================================
-- APPOINTMENTS
-- ============================================

CREATE POLICY "Therapists can manage appointments"
ON public.appointments FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Users can view own appointments"
ON public.appointments FOR SELECT
USING (
  therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = auth.uid()
  )
);

-- ============================================
-- MEDICAL RECORDS
-- ============================================

CREATE POLICY "Therapists can manage medical records"
ON public.medical_records FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Patients can view own medical records"
ON public.medical_records FOR SELECT
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = auth.uid()
  )
);

-- ============================================
-- SOAP RECORDS
-- ============================================

CREATE POLICY "Therapists can view soap records"
ON public.soap_records FOR SELECT
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Patients can view own soap records"
ON public.soap_records FOR SELECT
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Therapists can create soap records"
ON public.soap_records FOR INSERT
WITH CHECK (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Therapists can update unsigned soap records"
ON public.soap_records FOR UPDATE
USING (
  signed_at IS NULL
  AND public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Admins can delete soap records"
ON public.soap_records FOR DELETE
USING (public.user_is_admin(auth.uid()));

-- ============================================
-- EXERCISES
-- ============================================

CREATE POLICY "All users can view exercises"
ON public.exercises FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Therapists can manage exercises"
ON public.exercises FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

-- ============================================
-- EXERCISE PLANS
-- ============================================

CREATE POLICY "Therapists can manage exercise plans"
ON public.exercise_plans FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Patients can view own exercise plans"
ON public.exercise_plans FOR SELECT
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = auth.uid()
  )
);

-- ============================================
-- EXERCISE PLAN ITEMS
-- ============================================

CREATE POLICY "Therapists can manage exercise plan items"
ON public.exercise_plan_items FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

CREATE POLICY "Users can view exercise plan items"
ON public.exercise_plan_items FOR SELECT
USING (
  plan_id IN (SELECT id FROM exercise_plans)
);

-- ============================================
-- TREATMENT SESSIONS
-- ============================================

CREATE POLICY "Therapists can manage treatment sessions"
ON public.treatment_sessions FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

-- ============================================
-- PATIENT PROGRESS
-- ============================================

CREATE POLICY "Therapists can manage patient progress"
ON public.patient_progress FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

-- ============================================
-- REPORTS
-- ============================================

CREATE POLICY "Therapists can manage reports"
ON public.reports FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

-- ============================================
-- EVENTOS
-- ============================================

CREATE POLICY "Admins e fisios podem ver todos os eventos"
ON public.eventos FOR SELECT
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

CREATE POLICY "Admins e fisios podem criar eventos"
ON public.eventos FOR INSERT
WITH CHECK (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

CREATE POLICY "Admins e fisios podem atualizar eventos"
ON public.eventos FOR UPDATE
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

CREATE POLICY "Apenas admins podem deletar eventos"
ON public.eventos FOR DELETE
USING (public.user_is_admin(auth.uid()));

-- ============================================
-- PRESTADORES
-- ============================================

CREATE POLICY "Acesso a prestadores segue acesso aos eventos"
ON public.prestadores FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

-- ============================================
-- CHECKLIST ITEMS
-- ============================================

CREATE POLICY "Acesso ao checklist segue acesso aos eventos"
ON public.checklist_items FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

-- ============================================
-- PARTICIPANTES
-- ============================================

CREATE POLICY "Acesso aos participantes segue acesso aos eventos"
ON public.participantes FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

-- ============================================
-- PAGAMENTOS
-- ============================================

CREATE POLICY "Apenas admins e fisios acessam pagamentos"
ON public.pagamentos FOR ALL
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

-- 8. Adicionar comentários para documentação
COMMENT ON FUNCTION public.user_has_role IS 'Security definer function to check if user has specific role - prevents RLS recursion';
COMMENT ON FUNCTION public.user_has_any_role IS 'Security definer function to check if user has any of specified roles - prevents RLS recursion';
COMMENT ON FUNCTION public.user_is_admin IS 'Security definer function to check if user is admin - prevents RLS recursion';
COMMENT ON FUNCTION public.user_is_fisio_or_admin IS 'Security definer function to check if user is fisio or admin - prevents RLS recursion';

COMMENT ON TABLE public.user_roles IS 'Stores user roles separately from profiles to prevent privilege escalation attacks. Uses security definer functions in RLS policies.';