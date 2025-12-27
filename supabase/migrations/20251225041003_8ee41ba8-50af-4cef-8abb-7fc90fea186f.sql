-- ============================================
-- Habilitar RLS na tabela clinic_inventory
-- ============================================

-- 1. Habilitar RLS
ALTER TABLE public.clinic_inventory ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Membros org acessam inventário" ON public.clinic_inventory;
DROP POLICY IF EXISTS "Admins gerenciam inventário" ON public.clinic_inventory;
DROP POLICY IF EXISTS "clinic_inventory_select" ON public.clinic_inventory;
DROP POLICY IF EXISTS "clinic_inventory_all" ON public.clinic_inventory;
DROP POLICY IF EXISTS "clinic_inventory_insert" ON public.clinic_inventory;
DROP POLICY IF EXISTS "clinic_inventory_update" ON public.clinic_inventory;
DROP POLICY IF EXISTS "clinic_inventory_delete" ON public.clinic_inventory;

-- 3. Política SELECT: Admin e Fisioterapeutas da organização podem visualizar
CREATE POLICY "clinic_inventory_select"
ON public.clinic_inventory
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_organization(auth.uid(), organization_id)
  AND public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

-- 4. Política INSERT: Apenas admins da organização podem inserir
CREATE POLICY "clinic_inventory_insert"
ON public.clinic_inventory
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_belongs_to_organization(auth.uid(), organization_id)
  AND public.user_is_admin(auth.uid())
);

-- 5. Política UPDATE: Apenas admins da organização podem atualizar
CREATE POLICY "clinic_inventory_update"
ON public.clinic_inventory
FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_organization(auth.uid(), organization_id)
  AND public.user_is_admin(auth.uid())
)
WITH CHECK (
  public.user_belongs_to_organization(auth.uid(), organization_id)
  AND public.user_is_admin(auth.uid())
);

-- 6. Política DELETE: Apenas admins da organização podem deletar
CREATE POLICY "clinic_inventory_delete"
ON public.clinic_inventory
FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_organization(auth.uid(), organization_id)
  AND public.user_is_admin(auth.uid())
);