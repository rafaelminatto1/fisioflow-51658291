-- ============================================
-- FIX: Corrigir política RLS de user_roles que está causando erros 500
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

-- Criar política correta para SELECT
CREATE POLICY "user_roles_select_own" ON user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins podem ver todos os roles
CREATE POLICY "user_roles_select_admin" ON user_roles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Criar políticas para INSERT/UPDATE/DELETE (apenas admins)
CREATE POLICY "user_roles_manage_admin" ON user_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Comentários
COMMENT ON POLICY "user_roles_select_own" ON user_roles IS 'Usuários podem ver seus próprios roles';
COMMENT ON POLICY "user_roles_select_admin" ON user_roles IS 'Admins podem ver todos os roles';
COMMENT ON POLICY "user_roles_manage_admin" ON user_roles IS 'Apenas admins podem gerenciar roles';
