-- Corrigir políticas RLS da tabela appointments para permitir criação

-- Remover políticas antigas
DROP POLICY IF EXISTS "Membros da org gerenciam agendamentos" ON appointments;
DROP POLICY IF EXISTS "Estagiários gerenciam agendamentos de pacientes atribuídos" ON appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;

-- Criar política mais permissiva para INSERT
CREATE POLICY "Membros podem criar agendamentos"
ON appointments
FOR INSERT
WITH CHECK (
  -- Admin e fisioterapeuta podem criar agendamentos
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  AND (
    -- Se organization_id for NULL, permite (para compatibilidade)
    organization_id IS NULL
    OR
    -- Se organization_id existir, usuário deve pertencer à org
    user_belongs_to_organization(auth.uid(), organization_id)
  )
);

-- Política para SELECT
CREATE POLICY "Membros veem agendamentos da org"
ON appointments
FOR SELECT
USING (
  -- Admin e fisio veem tudo
  (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (
      organization_id IS NULL
      OR user_belongs_to_organization(auth.uid(), organization_id)
    )
  )
  OR
  -- Pacientes veem seus próprios
  (
    patient_id IN (
      SELECT p.id
      FROM patients p
      JOIN profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  )
  OR
  -- Estagiários veem de pacientes atribuídos
  (
    user_has_role(auth.uid(), 'estagiario'::app_role)
    AND estagiario_pode_acessar_paciente(auth.uid(), patient_id)
  )
);

-- Política para UPDATE
CREATE POLICY "Membros podem atualizar agendamentos"
ON appointments
FOR UPDATE
USING (
  (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (
      organization_id IS NULL
      OR user_belongs_to_organization(auth.uid(), organization_id)
    )
  )
  OR
  (
    user_has_role(auth.uid(), 'estagiario'::app_role)
    AND estagiario_pode_acessar_paciente(auth.uid(), patient_id)
  )
);

-- Política para DELETE
CREATE POLICY "Apenas admins podem deletar agendamentos"
ON appointments
FOR DELETE
USING (
  user_is_admin(auth.uid())
  AND (
    organization_id IS NULL
    OR user_belongs_to_organization(auth.uid(), organization_id)
  )
);