-- Restores Worker-facing tables that are referenced by the current codebase
-- and already have schema coverage in existing migrations.
-- This bundle is intentionally scoped and idempotent.

-- 0004_patient_predictions_metadata.sql
CREATE TABLE IF NOT EXISTS patient_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  prediction_type TEXT NOT NULL,
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_value NUMERIC(10,2),
  predicted_class TEXT,
  confidence_score NUMERIC(10,4) NOT NULL DEFAULT 0,
  confidence_interval JSONB,
  target_date TIMESTAMPTZ,
  timeframe_days INTEGER,
  model_version TEXT NOT NULL DEFAULT 'custom',
  model_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  treatment_recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  similar_cases JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_predictions
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS predicted_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS predicted_class TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_interval JSONB,
  ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timeframe_days INTEGER,
  ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS treatment_recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS similar_cases JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_patient_predictions_org_patient_date
  ON patient_predictions (organization_id, patient_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_predictions_org_patient_active
  ON patient_predictions (organization_id, patient_id, is_active);
CREATE INDEX IF NOT EXISTS idx_patient_predictions_org_type_date
  ON patient_predictions (organization_id, prediction_type, prediction_date DESC);

-- 0007_precadastro.sql
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

-- 0017_reports_and_public_booking.sql
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

-- 0018_exercise_sessions.sql
CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_type TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER,
  repetitions INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  metrics JSONB NOT NULL DEFAULT '{}',
  posture_issues_summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_patient
  ON exercise_sessions (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_exercise
  ON exercise_sessions (exercise_id, created_at DESC);

-- 0022_innovations_support.sql
CREATE TABLE IF NOT EXISTS clinic_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  item_name text NOT NULL,
  category text,
  current_quantity integer NOT NULL DEFAULT 0,
  minimum_quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidade',
  cost_per_unit numeric(12,2),
  supplier text,
  last_restock_date timestamptz,
  expiration_date timestamptz,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_inventory_org_active_name
  ON clinic_inventory (organization_id, is_active, item_name);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  reason text,
  related_appointment_id uuid,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_inventory_created
  ON inventory_movements (organization_id, inventory_id, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  therapist_id uuid NOT NULL,
  metric_date date NOT NULL,
  total_appointments integer NOT NULL DEFAULT 0,
  completed_appointments integer NOT NULL DEFAULT 0,
  cancelled_appointments integer NOT NULL DEFAULT 0,
  no_show_appointments integer NOT NULL DEFAULT 0,
  average_session_duration numeric(10,2),
  patient_satisfaction_avg numeric(10,2),
  revenue_generated numeric(12,2) NOT NULL DEFAULT 0,
  new_patients integer NOT NULL DEFAULT 0,
  returning_patients integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_performance_org_therapist_date
  ON staff_performance_metrics (organization_id, therapist_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  forecast_date date NOT NULL,
  predicted_revenue numeric(12,2) NOT NULL DEFAULT 0,
  actual_revenue numeric(12,2),
  predicted_appointments integer NOT NULL DEFAULT 0,
  actual_appointments integer,
  confidence_interval_low numeric(12,2) NOT NULL DEFAULT 0,
  confidence_interval_high numeric(12,2) NOT NULL DEFAULT 0,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_org_forecast_date
  ON revenue_forecasts (organization_id, forecast_date DESC);

CREATE TABLE IF NOT EXISTS whatsapp_exercise_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  exercise_plan_id uuid,
  phone_number text NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_exercise_queue_org_created
  ON whatsapp_exercise_queue (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  assessment_type text NOT NULL,
  question text NOT NULL,
  response text,
  numeric_value numeric(10,2),
  received_via text NOT NULL DEFAULT 'whatsapp',
  sent_at timestamptz,
  responded_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_self_assessments_org_patient_created
  ON patient_self_assessments (organization_id, patient_id, created_at DESC);

-- 0029_knowledge_base.sql
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  title text NOT NULL,
  "group" text NOT NULL,
  subgroup text NOT NULL DEFAULT '',
  focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence text NOT NULL DEFAULT 'B',
  year integer,
  source text,
  url text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, article_id)
);

CREATE TABLE IF NOT EXISTS knowledge_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('organization', 'user')),
  scope_key text NOT NULL,
  user_id uuid,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text,
  evidence text,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, article_id, scope, scope_key)
);

CREATE TABLE IF NOT EXISTS knowledge_curation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  assigned_to uuid,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, article_id)
);

CREATE TABLE IF NOT EXISTS knowledge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_org_updated
  ON knowledge_articles (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_annotations_org_scope_user
  ON knowledge_annotations (organization_id, scope, user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_curation_org_updated
  ON knowledge_curation (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_audit_org_created
  ON knowledge_audit (organization_id, created_at DESC);

-- 0031_wiki_library.sql
ALTER TABLE knowledge_articles
  ADD COLUMN IF NOT EXISTS article_type text NOT NULL DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS clinical_implications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vector_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS citation_count integer,
  ADD COLUMN IF NOT EXISTS raw_text text;

CREATE TABLE IF NOT EXISTS knowledge_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  page_ref integer,
  highlight_color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_notes_article_user_created
  ON knowledge_notes (organization_id, article_id, user_id, created_at DESC);

-- Targeted extraction from 0036_patient_resources_sync_hotfix.sql
CREATE TABLE IF NOT EXISTS treatment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  therapist_id TEXT NOT NULL,
  appointment_id TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subjective TEXT,
  objective JSONB,
  assessment TEXT,
  plan TEXT,
  observations TEXT,
  exercises_performed JSONB NOT NULL DEFAULT '[]'::jsonb,
  pain_level_before INTEGER,
  pain_level_after INTEGER,
  next_session_goals TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE treatment_sessions
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS therapist_id TEXT,
  ADD COLUMN IF NOT EXISTS appointment_id TEXT,
  ADD COLUMN IF NOT EXISTS session_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS subjective TEXT,
  ADD COLUMN IF NOT EXISTS objective JSONB,
  ADD COLUMN IF NOT EXISTS assessment TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS exercises_performed JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pain_level_before INTEGER,
  ADD COLUMN IF NOT EXISTS pain_level_after INTEGER,
  ADD COLUMN IF NOT EXISTS next_session_goals TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_date
  ON treatment_sessions (organization_id, patient_id, session_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_appointment
  ON treatment_sessions (organization_id, appointment_id);
