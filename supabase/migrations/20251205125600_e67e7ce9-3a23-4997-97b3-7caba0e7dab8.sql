-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Membros podem criar tarefas" ON tarefas;

-- Create more permissive INSERT policy
CREATE POLICY "Membros podem criar tarefas"
ON tarefas
FOR INSERT
WITH CHECK (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
  AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
);

-- Also update SELECT policy to allow users to see their own tasks
DROP POLICY IF EXISTS "Membros veem tarefas da org" ON tarefas;

CREATE POLICY "Membros veem tarefas da org"
ON tarefas
FOR SELECT
USING (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
  AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
);

-- Update policy to allow members to update tasks
DROP POLICY IF EXISTS "Membros podem atualizar tarefas" ON tarefas;

CREATE POLICY "Membros podem atualizar tarefas"
ON tarefas
FOR UPDATE
USING (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
  AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
);