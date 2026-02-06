-- ============================================
-- DOCTORS TABLE
-- Tabela para gerenciamento de médicos
-- ============================================

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT,
  crm TEXT,
  crm_state TEXT,
  phone TEXT,
  email TEXT,
  clinic_name TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_doctors_org_active ON doctors(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_doctors_name_trgm ON doctors USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty) WHERE specialty IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_doctors_tsv ON doctors USING GIN(
  to_tsvector('portuguese', 
    name || ' ' || 
    COALESCE(specialty, '') || ' ' || 
    COALESCE(clinic_name, '')
  )
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policy
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctors_org_policy ON doctors
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);
