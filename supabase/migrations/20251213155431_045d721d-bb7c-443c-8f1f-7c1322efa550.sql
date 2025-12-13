-- ================================================
-- FIX 1: profiles_overly_broad_access
-- Restringir acesso a email e telefone apenas para próprio usuário e admins
-- ================================================

-- Criar view segura que oculta dados sensíveis para não-admins
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  id, 
  user_id, 
  full_name, 
  avatar_url, 
  organization_id,
  created_at,
  updated_at,
  -- Email só visível para o próprio usuário ou admins
  CASE 
    WHEN user_id = auth.uid() OR user_has_role(auth.uid(), 'admin'::app_role)
    THEN email 
    ELSE NULL 
  END as email,
  -- Telefone só visível para o próprio usuário ou admins
  CASE 
    WHEN user_id = auth.uid() OR user_has_role(auth.uid(), 'admin'::app_role)
    THEN phone 
    ELSE NULL 
  END as phone
FROM profiles;

-- Comentário explicativo
COMMENT ON VIEW public.profiles_safe IS 'View segura de profiles que oculta email e telefone para usuários não-admin';

-- ================================================
-- FIX 2: medical_records_intern_write
-- Adicionar workflow de aprovação para prontuários de estagiários
-- ================================================

-- Adicionar colunas de revisão na tabela medical_records
ALTER TABLE medical_records 
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Atualizar registros existentes (marcar como aprovados)
UPDATE medical_records 
SET review_status = 'approved' 
WHERE review_status IS NULL;

-- Drop políticas existentes de estagiários para medical_records
DROP POLICY IF EXISTS "Estagiários criam prontuários de pacientes atribuídos" ON medical_records;
DROP POLICY IF EXISTS "Estagiários atualizam prontuários de pacientes atribuídos" ON medical_records;

-- Estagiários podem criar apenas drafts
CREATE POLICY "Estagiários criam drafts de prontuários"
ON medical_records FOR INSERT
WITH CHECK (
  user_has_role(auth.uid(), 'estagiario'::app_role) AND
  estagiario_pode_acessar_paciente(auth.uid(), patient_id) AND
  review_status = 'draft' AND
  created_by = auth.uid()
);

-- Estagiários podem atualizar apenas seus próprios drafts
CREATE POLICY "Estagiários atualizam próprios drafts"
ON medical_records FOR UPDATE
USING (
  user_has_role(auth.uid(), 'estagiario'::app_role) AND
  estagiario_pode_acessar_paciente(auth.uid(), patient_id) AND
  review_status = 'draft' AND
  created_by = auth.uid()
)
WITH CHECK (
  review_status = 'draft'
);

-- Supervisores (fisioterapeutas/admins) podem aprovar prontuários
CREATE POLICY "Supervisores aprovam prontuários"
ON medical_records FOR UPDATE
USING (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]) AND
  review_status = 'draft'
)
WITH CHECK (
  review_status IN ('approved', 'rejected') AND
  reviewed_by = auth.uid() AND
  reviewed_at IS NOT NULL
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_medical_records_review_status ON medical_records(review_status);
CREATE INDEX IF NOT EXISTS idx_medical_records_created_by ON medical_records(created_by);

-- Comentários
COMMENT ON COLUMN medical_records.review_status IS 'Status de revisão: draft, approved, rejected';
COMMENT ON COLUMN medical_records.reviewed_by IS 'ID do supervisor que aprovou/rejeitou';
COMMENT ON COLUMN medical_records.reviewed_at IS 'Data/hora da revisão';
COMMENT ON COLUMN medical_records.created_by IS 'ID do usuário que criou o registro';