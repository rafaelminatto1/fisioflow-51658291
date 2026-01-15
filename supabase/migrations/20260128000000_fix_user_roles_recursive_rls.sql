-- ============================================
-- FIX: Corrigir política RLS de user_roles que tem referência circular
-- ============================================
-- A migration 20260127000001_fix_user_roles_rls_policy.sql introduziu políticas
-- que consultam diretamente a tabela user_roles (EXISTS (SELECT 1 FROM user_roles...)),
-- criando uma referência circular que causa problemas de permissão.
--
-- Esta correção usa a função private.is_admin_secure() que já existe desde
-- a migration 20260114160000_fix_recursive_rls.sql.

-- Remover TODAS as políticas existentes de user_roles (incluindo as antigas)
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles_delete_gen" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles_insert_gen" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles_update_gen" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "consolidated_select_user_roles_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON user_roles;

-- Recriar políticas corretas usando private.is_admin_secure()
-- Esta função é SECURITY DEFINER e bypassa o RLS para verificar admin status

-- Política para SELECT: usuário vê próprio role OU é admin
CREATE POLICY "user_roles_select_own_or_admin" ON user_roles
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    private.is_admin_secure()
);

-- Política para INSERT/UPDATE/DELETE: apenas admins
CREATE POLICY "user_roles_admin_manage" ON user_roles
FOR ALL TO authenticated
USING (
    private.is_admin_secure()
)
WITH CHECK (
    private.is_admin_secure()
);

-- Comentários
COMMENT ON POLICY "user_roles_select_own_or_admin" ON user_roles IS 'Usuários podem ver seus próprios roles ou admins podem ver todos';
COMMENT ON POLICY "user_roles_admin_manage" ON user_roles IS 'Apenas admins podem gerenciar roles (usa private.is_admin_secure para evitar recursão)';
