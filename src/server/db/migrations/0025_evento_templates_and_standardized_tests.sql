CREATE TABLE IF NOT EXISTS evento_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  categoria text,
  gratuito boolean NOT NULL DEFAULT false,
  valor_padrao_prestador numeric(12,2),
  checklist_padrao jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evento_templates_org_created
  ON evento_templates (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS standardized_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_type text NOT NULL,
  test_name text NOT NULL,
  score numeric(10,2) NOT NULL DEFAULT 0,
  max_score numeric(10,2) NOT NULL DEFAULT 0,
  interpretation text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standardized_test_results_patient_created
  ON standardized_test_results (patient_id, created_at DESC);
