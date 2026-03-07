CREATE TABLE IF NOT EXISTS precadastro_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  token TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  max_usos INTEGER,
  usos_atuais INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  campos_obrigatorios TEXT[] NOT NULL DEFAULT ARRAY['nome', 'email']::TEXT[],
  campos_opcionais TEXT[] NOT NULL DEFAULT ARRAY['telefone']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_precadastro_tokens_org_created
  ON precadastro_tokens (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_precadastro_tokens_token
  ON precadastro_tokens (token);

CREATE TABLE IF NOT EXISTS precadastros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES precadastro_tokens(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  endereco TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  converted_at TIMESTAMPTZ,
  patient_id UUID,
  dados_adicionais JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_precadastros_org_created
  ON precadastros (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_precadastros_token
  ON precadastros (token_id, created_at DESC);
