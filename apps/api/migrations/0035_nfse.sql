-- Migration 0035: NFS-e (Nota Fiscal de Serviços Eletrônica) — padrão ABRASF

CREATE TABLE IF NOT EXISTS nfse_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  numero_nfse TEXT,
  numero_rps TEXT NOT NULL,
  serie_rps TEXT NOT NULL DEFAULT 'RPS',
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  valor_servico NUMERIC(10,2) NOT NULL,
  aliquota_iss NUMERIC(5,4) DEFAULT 0.02,
  valor_iss NUMERIC(10,2),
  valor_deducoes NUMERIC(10,2) DEFAULT 0,
  valor_base_calculo NUMERIC(10,2),
  iss_retido BOOLEAN DEFAULT FALSE,
  codigo_servico TEXT NOT NULL DEFAULT '14.01',
  discriminacao TEXT NOT NULL,
  municipio_prestacao TEXT DEFAULT '3550308', -- São Paulo IBGE code
  -- Tomador (paciente/responsável)
  tomador_nome TEXT,
  tomador_cpf_cnpj TEXT,
  tomador_email TEXT,
  tomador_logradouro TEXT,
  tomador_numero TEXT,
  tomador_complemento TEXT,
  tomador_bairro TEXT,
  tomador_cidade TEXT,
  tomador_uf TEXT,
  tomador_cep TEXT,
  -- Status e controle
  status TEXT DEFAULT 'rascunho', -- rascunho, enviado, autorizado, cancelado, erro
  erro_message TEXT,
  xml_rps TEXT,
  xml_nfse TEXT,
  numero_lote TEXT,
  codigo_verificacao TEXT,
  link_nfse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfse_records_org ON nfse_records (organization_id);
CREATE INDEX IF NOT EXISTS idx_nfse_records_patient ON nfse_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_nfse_records_status ON nfse_records (status);
CREATE INDEX IF NOT EXISTS idx_nfse_records_data_emissao ON nfse_records (data_emissao DESC);

-- Configuração do prestador NFS-e por organização
CREATE TABLE IF NOT EXISTS nfse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  inscricao_municipal TEXT NOT NULL,
  codigo_municipio TEXT NOT NULL DEFAULT '3550308',
  regime_tributario TEXT DEFAULT '1', -- 1=Simples Nacional, 3=Normal
  optante_simples BOOLEAN DEFAULT TRUE,
  incentivo_fiscal BOOLEAN DEFAULT FALSE,
  aliquota_padrao NUMERIC(5,4) DEFAULT 0.02,
  codigo_servico_padrao TEXT DEFAULT '14.01',
  discriminacao_padrao TEXT DEFAULT 'Serviços de Fisioterapia',
  certificado_pfx_kv_key TEXT, -- chave no KV onde o certificado está armazenado (encrypted)
  ambiente TEXT DEFAULT 'homologacao', -- homologacao, producao
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
