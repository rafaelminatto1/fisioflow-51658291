-- ============================================
-- FIX: Corrigir política RLS de appointments
-- ============================================
-- Problema: A política está usando profiles.role que pode não existir
--           e funções que podem estar falhando
-- ============================================

-- Remover política antiga
DROP POLICY IF EXISTS "consolidated_select_appointments_policy" ON "public"."appointments";
DROP POLICY IF EXISTS "Admin and therapist can view org appointments" ON appointments;
DROP POLICY IF EXISTS "Intern can view org appointments" ON appointments;
DROP POLICY IF EXISTS "Admin and therapist can create org appointments" ON appointments;
DROP POLICY IF EXISTS "Admin and therapist can update org appointments" ON appointments;
DROP POLICY IF EXISTS "Intern can update org appointments" ON appointments;
DROP POLICY IF EXISTS "Admin and therapist can delete org appointments" ON appointments;
DROP POLICY IF EXISTS "Therapists can manage appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;

-- Criar política consolidada e robusta para SELECT
CREATE POLICY "consolidated_select_appointments_policy" ON "public"."appointments"
FOR SELECT
TO authenticated
USING (
  -- Admins têm acesso completo (verificar user_roles primeiro)
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  -- Verificar organization_members como fallback
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND active = true
  )
  OR
  -- Fisioterapeutas e estagiários veem agendamentos da organização
  (
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
  )
  OR
  -- Fallback: usuários autenticados veem agendamentos da sua organização
  (
    auth.role() = 'authenticated'
    AND (
      organization_id IS NULL
      OR organization_id = (
        SELECT organization_id FROM profiles
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    )
  )
);

-- Criar políticas para INSERT
CREATE POLICY "appointments_insert_authenticated" ON appointments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
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

-- Criar políticas para UPDATE
CREATE POLICY "appointments_update_authenticated" ON appointments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
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
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
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

-- Criar políticas para DELETE (apenas admins)
CREATE POLICY "appointments_delete_admin" ON appointments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Comentários
COMMENT ON POLICY "consolidated_select_appointments_policy" ON "public"."appointments" IS 
'Permite que usuários autenticados vejam agendamentos. Admins têm acesso completo. Outros usuários veem apenas agendamentos da sua organização.';
