-- ============================================
-- FIX COMPLETO: onboarding_progress e user_roles
-- ============================================

-- Primeiro, verificar se a tabela organizations existe (não pode ser NOT NULL na migration)
DO $$
BEGIN
    -- Se a tabela onboarding_progress existe e tem organization_id como NOT NULL
    -- mas a tabela organizations pode não existir ainda, precisamos ajustar
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'onboarding_progress'
        AND table_schema = 'public'
    ) THEN
        -- Tornar organization_id opcional se a tabela organizations não existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'organizations'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.onboarding_progress
            ALTER COLUMN organization_id DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- Recriar tabela onboarding_progress do zero (se necessário)
DROP TABLE IF EXISTS public.onboarding_progress CASCADE;

CREATE TABLE public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID, -- Removida referência para organizations pois pode não existir
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

-- Habilitar RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Criar policies corretas
DROP POLICY IF EXISTS "Users manage own onboarding" ON public.onboarding_progress;

CREATE POLICY "Users can manage own onboarding"
ON public.onboarding_progress
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);

-- ============================================================
-- Corrigir user_roles para permitir inserção durante cadastro
-- ============================================================

-- Primeiro, garantir que a função private.is_admin_secure existe
CREATE OR REPLACE FUNCTION private.is_admin_secure()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se o usuário é admin consultando a tabela profiles
    -- que não tem RLS circular
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$;

-- Remover todas as policies antigas de user_roles
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Policy para SELECT: usuário pode ver próprio role
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy para INSERT: permitir inserção (necessário para cadastro)
-- Usamos uma abordagem diferente: verificar se está sendo inserido pelo próprio usuário
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() -- Usuário pode inserir seu próprio role
);

-- Policy para UPDATE: apenas admins
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (private.is_admin_secure())
WITH CHECK (private.is_admin_secure());

-- Policy para DELETE: apenas admins
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (private.is_admin_secure());

-- Comentários
COMMENT ON TABLE public.onboarding_progress IS 'Progresso do onboarding por usuário';
COMMENT ON POLICY "Users can manage own onboarding" ON public.onboarding_progress IS 'Usuários podem gerenciar seu próprio onboarding';
COMMENT ON POLICY "Users can view own roles" ON public.user_roles IS 'Usuários podem ver seus próprios roles';
COMMENT ON POLICY "Users can insert own role" ON public.user_roles IS 'Usuários podem inserir seu próprio role durante cadastro';
