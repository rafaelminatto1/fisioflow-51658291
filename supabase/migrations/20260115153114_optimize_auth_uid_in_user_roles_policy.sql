-- ============================================
-- OPTIMIZE: Remover subquery desnecessário em user_roles_select_own_or_admin
-- ============================================
-- A política usava (select auth.uid()) quando poderia usar auth.uid() diretamente.
-- Esta é uma otimização de performance que simplifica a expressão.

-- Recriar a política SELECT otimizada
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON user_roles;

CREATE POLICY "user_roles_select_own_or_admin" ON user_roles
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    private.is_admin_secure()
);

COMMENT ON POLICY "user_roles_select_own_or_admin" ON user_roles IS 'Usuários podem ver seus próprios roles ou admins podem ver todos';
