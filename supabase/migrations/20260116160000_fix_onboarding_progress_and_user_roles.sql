-- ============================================
-- FIX: Garantir que onboarding_progress e user_roles estão corretos
-- ============================================

-- 1. Garantir que a tabela onboarding_progress existe
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

-- 2. Garantir RLS está habilitado
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- 3. Remover e recriar as policies de onboarding_progress
DROP POLICY IF EXISTS "Users manage own onboarding" ON public.onboarding_progress;
CREATE POLICY "Users manage own onboarding" ON public.onboarding_progress
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Garantir que user_roles tem as políticas corretas
-- (A migration 20260128000000 já deve ter criado, mas vamos garantir)
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    private.is_admin_secure()
);

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
FOR ALL TO authenticated
USING (
    private.is_admin_secure()
)
WITH CHECK (
    private.is_admin_secure()
);

-- Comentários
COMMENT ON POLICY "Users manage own onboarding" ON public.onboarding_progress IS 'Usuários podem gerenciar seu próprio onboarding';
COMMENT ON POLICY "user_roles_select_own_or_admin" ON public.user_roles IS 'Usuários podem ver seus próprios roles ou admins podem ver todos';
COMMENT ON POLICY "user_roles_admin_manage" ON public.user_roles IS 'Apenas admins podem gerenciar roles (usa private.is_admin_secure para evitar recursão)';
