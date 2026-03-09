CREATE TABLE IF NOT EXISTS medical_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  nome text NOT NULL,
  descricao text,
  tipo_relatorio varchar(40) NOT NULL,
  campos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_report_templates_org
  ON medical_report_templates (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS medical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid,
  report_type varchar(40) NOT NULL,
  data_emissao timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_reports_org_emissao
  ON medical_reports (organization_id, data_emissao DESC);

CREATE INDEX IF NOT EXISTS idx_medical_reports_patient
  ON medical_reports (patient_id, data_emissao DESC);

CREATE TABLE IF NOT EXISTS convenio_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid,
  convenio_id uuid,
  data_emissao timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convenio_reports_org_emissao
  ON convenio_reports (organization_id, data_emissao DESC);

CREATE INDEX IF NOT EXISTS idx_convenio_reports_patient
  ON convenio_reports (patient_id, data_emissao DESC);

CREATE TABLE IF NOT EXISTS public_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  profile_id uuid,
  profile_user_id text,
  slug text NOT NULL,
  professional_name text,
  requested_date date NOT NULL,
  requested_time varchar(10) NOT NULL,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  patient_email text,
  notes text,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_booking_requests_slug_date
  ON public_booking_requests (slug, requested_date, requested_time);

CREATE INDEX IF NOT EXISTS idx_public_booking_requests_org_created
  ON public_booking_requests (organization_id, created_at DESC);
