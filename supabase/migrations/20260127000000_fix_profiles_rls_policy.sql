-- ============================================
-- FIX: Corrigir política RLS de profiles que está causando erros 500
-- ============================================
-- Problema: A política está comparando auth.uid() com id (UUID do profile)
--           quando deveria comparar com user_id
-- ============================================

-- Remover políticas incorretas
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON profiles;
DROP POLICY IF EXISTS "secure_profile_select" ON profiles;
DROP POLICY IF EXISTS "secure_profile_update" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Therapists can view patient profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Criar políticas corretas para SELECT
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Permitir que admins vejam todos os perfis da organização
CREATE POLICY "profiles_select_admin_org" ON profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  AND (
    organization_id IS NULL
    OR organization_id = (
      SELECT organization_id FROM profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- Permitir que fisioterapeutas vejam perfis da organização
CREATE POLICY "profiles_select_therapist_org" ON profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('fisioterapeuta', 'estagiario')
  )
  AND (
    organization_id IS NULL
    OR organization_id = (
      SELECT organization_id FROM profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- Criar políticas corretas para UPDATE
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins podem atualizar perfis da organização
CREATE POLICY "profiles_update_admin_org" ON profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  AND (
    organization_id IS NULL
    OR organization_id = (
      SELECT organization_id FROM profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  AND (
    organization_id IS NULL
    OR organization_id = (
      SELECT organization_id FROM profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- Criar política correta para INSERT
CREATE POLICY "profiles_insert_authenticated" ON profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Comentários
COMMENT ON POLICY "profiles_select_own" ON profiles IS 'Usuários podem ver seu próprio perfil';
COMMENT ON POLICY "profiles_select_admin_org" ON profiles IS 'Admins podem ver todos os perfis da organização';
COMMENT ON POLICY "profiles_select_therapist_org" ON profiles IS 'Fisioterapeutas podem ver perfis da organização';
COMMENT ON POLICY "profiles_update_own" ON profiles IS 'Usuários podem atualizar seu próprio perfil';
COMMENT ON POLICY "profiles_update_admin_org" ON profiles IS 'Admins podem atualizar perfis da organização';
COMMENT ON POLICY "profiles_insert_authenticated" ON profiles IS 'Usuários autenticados podem inserir seu próprio perfil';
