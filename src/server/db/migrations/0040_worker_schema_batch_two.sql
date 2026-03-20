-- Formaliza o próximo lote de tabelas usadas diretamente pelas rotas do Worker
-- e que ainda não possuíam migration dedicada no repositório.

CREATE TABLE IF NOT EXISTS evaluation_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  referencias TEXT,
  tipo TEXT NOT NULL DEFAULT 'anamnese',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  cover_image TEXT,
  estimated_time INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE evaluation_forms
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS referencias TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'anamnese',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS estimated_time INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_evaluation_forms_org_created
  ON evaluation_forms (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_forms_org_nome
  ON evaluation_forms (organization_id, nome);

CREATE TABLE IF NOT EXISTS evaluation_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES evaluation_forms(id) ON DELETE CASCADE,
  tipo_campo TEXT NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT,
  opcoes JSONB,
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  grupo TEXT,
  descricao TEXT,
  minimo NUMERIC,
  maximo NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE evaluation_form_fields
  ADD COLUMN IF NOT EXISTS form_id UUID,
  ADD COLUMN IF NOT EXISTS tipo_campo TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS placeholder TEXT,
  ADD COLUMN IF NOT EXISTS opcoes JSONB,
  ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grupo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS minimo NUMERIC,
  ADD COLUMN IF NOT EXISTS maximo NUMERIC,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_evaluation_form_fields_form_ordem
  ON evaluation_form_fields (form_id, ordem);

CREATE TABLE IF NOT EXISTS patient_evaluation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES evaluation_forms(id) ON DELETE CASCADE,
  appointment_id UUID,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_evaluation_responses
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS form_id UUID,
  ADD COLUMN IF NOT EXISTS appointment_id UUID,
  ADD COLUMN IF NOT EXISTS responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_patient_evaluation_responses_patient_created
  ON patient_evaluation_responses (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_evaluation_responses_form_created
  ON patient_evaluation_responses (form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_evaluation_responses_org_form_created
  ON patient_evaluation_responses (organization_id, form_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pain_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  evolution_id UUID,
  body_region TEXT,
  pain_level INTEGER,
  color_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_maps_org_patient_created
  ON pain_maps (organization_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pain_maps_org_evolution_created
  ON pain_maps (organization_id, evolution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pain_map_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pain_map_id UUID NOT NULL REFERENCES pain_maps(id) ON DELETE CASCADE,
  x_coordinate NUMERIC(10,4),
  y_coordinate NUMERIC(10,4),
  intensity INTEGER,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_map_points_map_created
  ON pain_map_points (pain_map_id, created_at ASC);

CREATE TABLE IF NOT EXISTS wiki_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES wiki_categories(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_wiki_categories_org_order
  ON wiki_categories (organization_id, order_index ASC, name ASC);

CREATE TABLE IF NOT EXISTS wiki_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES wiki_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT,
  block_id TEXT,
  selection_text TEXT,
  selection_start INTEGER,
  selection_end INTEGER,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wiki_comments_page_created
  ON wiki_comments (organization_id, page_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wiki_comments_parent_created
  ON wiki_comments (parent_comment_id, created_at ASC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  user_id TEXT NOT NULL,
  organization_id TEXT,
  appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  exercise_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  progress_updates BOOLEAN NOT NULL DEFAULT TRUE,
  system_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  therapist_messages BOOLEAN NOT NULL DEFAULT TRUE,
  payment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  weekend_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS organization_id TEXT,
  ADD COLUMN IF NOT EXISTS appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS exercise_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS progress_updates BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS system_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS therapist_messages BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS payment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS weekend_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON notification_preferences (user_id);
