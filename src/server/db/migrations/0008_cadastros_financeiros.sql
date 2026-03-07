CREATE TABLE IF NOT EXISTS empresas_parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  contrapartidas TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresas_parceiras_org_nome
  ON empresas_parceiras (organization_id, nome);

CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  tipo_pessoa TEXT NOT NULL DEFAULT 'pj',
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  inscricao_estadual TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  observacoes TEXT,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_org_razao_social
  ON fornecedores (organization_id, razao_social);

CREATE TABLE IF NOT EXISTS formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'geral',
  taxa_percentual NUMERIC(10,2) NOT NULL DEFAULT 0,
  dias_recebimento INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_org_nome
  ON formas_pagamento (organization_id, nome);
