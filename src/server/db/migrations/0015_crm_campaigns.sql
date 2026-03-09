CREATE TABLE IF NOT EXISTS crm_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  created_by UUID,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  conteudo TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  total_destinatarios INTEGER NOT NULL DEFAULT 0,
  total_enviados INTEGER NOT NULL DEFAULT 0,
  agendada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_campanha_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES crm_campanhas(id) ON DELETE CASCADE,
  patient_id UUID,
  lead_id UUID,
  canal TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_campanhas_org_created_at
  ON crm_campanhas (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_campanha_envios_campanha
  ON crm_campanha_envios (campanha_id, created_at DESC);
