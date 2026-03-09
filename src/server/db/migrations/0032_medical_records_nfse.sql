CREATE TABLE IF NOT EXISTS physical_examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by text,
  vital_signs jsonb NOT NULL DEFAULT '{}'::jsonb,
  general_appearance text,
  heent text,
  cardiovascular text,
  respiratory text,
  gastrointestinal text,
  musculoskeletal text,
  neurological text,
  integumentary text,
  psychological text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physical_examinations_patient_date
  ON physical_examinations (patient_id, record_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by text,
  diagnosis jsonb NOT NULL DEFAULT '[]'::jsonb,
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_date
  ON treatment_plans (patient_id, record_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS medical_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by text,
  category text NOT NULL DEFAULT 'other',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_attachments_patient_uploaded
  ON medical_attachments (patient_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_attachments_record_uploaded
  ON medical_attachments (record_id, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS nfse_config (
  organization_id uuid PRIMARY KEY,
  ambiente text NOT NULL DEFAULT 'homologacao',
  municipio_codigo text,
  cnpj_prestador text,
  inscricao_municipal text,
  aliquota_iss numeric(8,2) NOT NULL DEFAULT 5,
  auto_emissao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nfse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text NOT NULL,
  serie text NOT NULL DEFAULT '1',
  tipo text NOT NULL,
  valor numeric(12,2) NOT NULL,
  data_emissao timestamptz NOT NULL DEFAULT now(),
  data_prestacao date NOT NULL,
  destinatario jsonb NOT NULL DEFAULT '{}'::jsonb,
  prestador jsonb NOT NULL DEFAULT '{}'::jsonb,
  servico jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  chave_acesso text,
  protocolo text,
  verificacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_nfse_org_emissao
  ON nfse (organization_id, data_emissao DESC);
