CREATE TABLE IF NOT EXISTS atestado_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  nome text NOT NULL,
  descricao text,
  conteudo text NOT NULL,
  variaveis_disponiveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atestado_templates_org_nome
  ON atestado_templates (organization_id, nome);

CREATE TABLE IF NOT EXISTS contrato_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'outro',
  conteudo text NOT NULL,
  variaveis_disponiveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_templates_org_nome
  ON contrato_templates (organization_id, nome);

CREATE TABLE IF NOT EXISTS communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid,
  appointment_id uuid,
  type text NOT NULL,
  recipient text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_org_created
  ON communication_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_org_type_status
  ON communication_logs (organization_id, type, status);

CREATE INDEX IF NOT EXISTS idx_communication_logs_patient
  ON communication_logs (patient_id, created_at DESC);
