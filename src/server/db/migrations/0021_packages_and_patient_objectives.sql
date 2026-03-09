CREATE TABLE IF NOT EXISTS session_package_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sessions_count integer NOT NULL,
  price numeric(12,2) NOT NULL,
  validity_days integer NOT NULL DEFAULT 365,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_package_templates_org_active
  ON session_package_templates (organization_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  package_template_id uuid,
  name text NOT NULL,
  total_sessions integer NOT NULL,
  used_sessions integer NOT NULL DEFAULT 0,
  remaining_sessions integer NOT NULL,
  price numeric(12,2) NOT NULL,
  payment_method text,
  status text NOT NULL DEFAULT 'active',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_packages_org_patient
  ON patient_packages (organization_id, patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS package_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_package_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  appointment_id uuid,
  used_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS idx_package_usage_patient_package
  ON package_usage (patient_package_id, used_at DESC);

CREATE TABLE IF NOT EXISTS patient_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  nome text NOT NULL,
  descricao text,
  categoria text,
  ativo boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_objectives_org_active
  ON patient_objectives (organization_id, ativo, categoria, nome);

CREATE TABLE IF NOT EXISTS patient_objective_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  objective_id uuid NOT NULL,
  prioridade integer NOT NULL DEFAULT 2,
  notas text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_objective_assignments_patient
  ON patient_objective_assignments (patient_id, prioridade, created_at DESC);
