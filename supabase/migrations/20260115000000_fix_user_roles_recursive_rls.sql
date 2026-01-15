-- ============================================
-- FIX: Corrigir política RLS de user_roles que tem referência circular
-- ============================================
-- A política anterior tentava verificar se o usuário é admin consultando
-- a própria tabela user_roles, criando uma referência circular.
-- Esta correção usa a função private.is_admin_secure() que verifica
-- a role de forma segura através da função helper.

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

-- Política para SELECT: usuário vê próprio role OU é admin
-- Usa auth.uid() diretamente para evitar referência circular
CREATE POLICY "user_roles_select_own" ON user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins podem ver todos os roles
-- Usa a função helper private.is_admin_secure() que não consulta user_roles diretamente
CREATE POLICY "user_roles_select_admin" ON user_roles
FOR SELECT TO authenticated
USING (private.is_admin_secure());

-- Política para INSERT: apenas admins (para novos usuários, o trigger já cria o role)
CREATE POLICY "user_roles_insert_admin" ON user_roles
FOR INSERT TO authenticated
WITH CHECK (private.is_admin_secure());

-- Política para UPDATE: apenas admins
CREATE POLICY "user_roles_update_admin" ON user_roles
FOR UPDATE TO authenticated
USING (private.is_admin_secure())
WITH CHECK (private.is_admin_secure());

-- Política para DELETE: apenas admins
CREATE POLICY "user_roles_delete_admin" ON user_roles
FOR DELETE TO authenticated
USING (private.is_admin_secure());

-- Comentários
COMMENT ON POLICY "user_roles_select_own" ON user_roles IS 'Usuários podem ver seus próprios roles';
COMMENT ON POLICY "user_roles_select_admin" ON user_roles IS 'Admins podem ver todos os roles';
COMMENT ON POLICY "user_roles_insert_admin" ON user_roles IS 'Apenas admins podem inserir roles';
COMMENT ON POLICY "user_roles_update_admin" ON user_roles IS 'Apenas admins podem atualizar roles';
COMMENT ON POLICY "user_roles_delete_admin" ON user_roles IS 'Apenas admins podem deletar roles';
