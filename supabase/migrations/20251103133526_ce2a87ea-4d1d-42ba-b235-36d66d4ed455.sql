-- ====================================
-- MULTI-TENANCY IMPLEMENTATION
-- ====================================

-- 1. Criar tabela de organizações (clínicas)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar tabela de membros da organização
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'estagiario'::app_role,
  active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Adicionar organization_id às tabelas principais
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.eventos 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.empresas_parceiras 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_org_id ON public.patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_exercises_org_id ON public.exercises(organization_id);
CREATE INDEX IF NOT EXISTS idx_eventos_org_id ON public.eventos(organization_id);

-- 5. Funções de segurança para multi-tenancy
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_organization_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'::app_role
      AND active = true
  )
$$;

-- 6. Trigger para atualizar updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS para organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem ver sua organização"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Admins da org podem atualizar"
  ON public.organizations
  FOR UPDATE
  USING (is_organization_admin(auth.uid(), id));

CREATE POLICY "Sistema pode criar organizações"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

-- 8. RLS para organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem membros da mesma org"
  ON public.organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Admins da org gerenciam membros"
  ON public.organization_members
  FOR ALL
  USING (is_organization_admin(auth.uid(), organization_id));

-- 9. Atualizar RLS de profiles
DROP POLICY IF EXISTS "Acesso controlado a perfis" ON public.profiles;
CREATE POLICY "Acesso controlado a perfis"
  ON public.profiles
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    (organization_id IS NOT NULL AND user_belongs_to_organization(auth.uid(), organization_id))
  );

-- 10. Atualizar RLS de patients
DROP POLICY IF EXISTS "Acesso controlado para visualizar pacientes" ON public.patients;
CREATE POLICY "Acesso controlado para visualizar pacientes"
  ON public.patients
  FOR SELECT
  USING (
    (organization_id IS NOT NULL AND user_belongs_to_organization(auth.uid(), organization_id))
    OR can_view_patient(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Terapeutas e estagiários podem criar pacientes" ON public.patients;
CREATE POLICY "Membros podem criar pacientes da org"
  ON public.patients
  FOR INSERT
  WITH CHECK (
    user_belongs_to_organization(auth.uid(), organization_id)
    AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
  );

DROP POLICY IF EXISTS "Apenas admins e fisios podem atualizar pacientes" ON public.patients;
CREATE POLICY "Membros podem atualizar pacientes da org"
  ON public.patients
  FOR UPDATE
  USING (
    user_belongs_to_organization(auth.uid(), organization_id)
    AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

-- 11. Atualizar RLS de appointments
DROP POLICY IF EXISTS "Admins e fisios gerenciam agendamentos" ON public.appointments;
CREATE POLICY "Membros da org gerenciam agendamentos"
  ON public.appointments
  FOR ALL
  USING (
    user_belongs_to_organization(auth.uid(), organization_id)
    AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

-- 12. Atualizar RLS de exercises
DROP POLICY IF EXISTS "All users can view exercises" ON public.exercises;
CREATE POLICY "Membros veem exercícios da org ou públicos"
  ON public.exercises
  FOR SELECT
  USING (
    organization_id IS NULL OR
    user_belongs_to_organization(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Therapists can manage exercises" ON public.exercises;
CREATE POLICY "Terapeutas gerenciam exercícios da org"
  ON public.exercises
  FOR ALL
  USING (
    (organization_id IS NULL AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
    OR (user_belongs_to_organization(auth.uid(), organization_id) AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
  );

-- 13. Atualizar RLS de eventos
DROP POLICY IF EXISTS "Admins e fisios podem ver todos os eventos" ON public.eventos;
CREATE POLICY "Membros veem eventos da org"
  ON public.eventos
  FOR SELECT
  USING (
    user_belongs_to_organization(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Admins e fisios podem criar eventos" ON public.eventos;
CREATE POLICY "Membros podem criar eventos da org"
  ON public.eventos
  FOR INSERT
  WITH CHECK (
    user_belongs_to_organization(auth.uid(), organization_id)
    AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

DROP POLICY IF EXISTS "Admins e fisios podem atualizar eventos" ON public.eventos;
CREATE POLICY "Membros podem atualizar eventos da org"
  ON public.eventos
  FOR UPDATE
  USING (
    user_belongs_to_organization(auth.uid(), organization_id)
    AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

-- 14. Função para criar organização demo (útil para testes)
CREATE OR REPLACE FUNCTION public.create_demo_organization()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, slug, settings)
  VALUES (
    'Activity Fisioterapia',
    'activity-fisio',
    '{"features": ["appointments", "events", "patients", "exercises"]}'::jsonb
  )
  RETURNING id INTO _org_id;
  
  RETURN _org_id;
END;
$$;

-- 15. Comentários para documentação
COMMENT ON TABLE public.organizations IS 'Tabela de organizações/clínicas para multi-tenancy';
COMMENT ON TABLE public.organization_members IS 'Relacionamento entre usuários e organizações com roles';
COMMENT ON FUNCTION public.user_belongs_to_organization IS 'Verifica se usuário pertence à organização';
COMMENT ON FUNCTION public.is_organization_admin IS 'Verifica se usuário é admin da organização';