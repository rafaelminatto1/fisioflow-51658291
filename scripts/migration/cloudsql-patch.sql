-- ============================================
-- PATCH SQL para corrigir erros do schema inicial
-- ============================================

-- 1. Habilitar extensão vector e adicionar coluna embedding
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- 2. Recriar índice vector (agora que a coluna existe)
DROP INDEX IF EXISTS exercises_embedding_idx;
CREATE INDEX exercises_embedding_idx ON exercises USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 3. Corrigir índice com CURRENT_DATE (usar função imutável)
DROP INDEX IF EXISTS idx_appointments_therapist_date;
CREATE INDEX idx_appointments_therapist_date ON appointments(therapist_id, date);

-- 4. Garantir que organization_id existe em exercise_plans
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exercise_plans' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE exercise_plans ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Recriar política RLS para exercise_plans
DROP POLICY IF EXISTS exercise_plans_org_policy ON exercise_plans;
CREATE POLICY exercise_plans_org_policy ON exercise_plans
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- 6. Garantir que exercise_plans tenha um valor padrão para organization_id
-- (Você precisará atualizar os registros existentes posteriormente)

SELECT 'Patch aplicado com sucesso!' as status;
