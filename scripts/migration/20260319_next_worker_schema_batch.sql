-- Applies the next Worker schema batch directly on Neon.
-- Scope:
--   0024_wearables_annotations_signatures.sql
--   0028_activity_lab.sql
--   0036_patient_resources_sync_hotfix.sql
--   0040_worker_schema_batch_two.sql

-- 0024_wearables_annotations_signatures.sql
CREATE TABLE IF NOT EXISTS wearable_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  patient_id UUID NOT NULL,
  source TEXT NOT NULL,
  data_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wearable_data_patient
  ON wearable_data (patient_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS asset_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '[]',
  author_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_annotations_asset
  ON asset_annotations (asset_id, version DESC);

CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_id TEXT,
  signature_image TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_doc
  ON document_signatures (document_id, signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_signatures_hash
  ON document_signatures (document_id, signature_hash);

CREATE TABLE IF NOT EXISTS treatment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  therapist_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  goals JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_cycles_patient
  ON treatment_cycles (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS evolution_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soap_record_id TEXT NOT NULL,
  saved_by TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'auto',
  content JSONB NOT NULL DEFAULT '{}',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_versions_record
  ON evolution_versions (soap_record_id, saved_at DESC);

-- 0028_activity_lab.sql
CREATE TABLE IF NOT EXISTS activity_lab_clinic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  clinic_name VARCHAR(150) NOT NULL,
  professional_name VARCHAR(150),
  registration_number VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_lab_clinic_profiles_org
  ON activity_lab_clinic_profiles (organization_id);

CREATE TABLE IF NOT EXISTS activity_lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  protocol_name VARCHAR(160) NOT NULL,
  body_part VARCHAR(120) NOT NULL,
  side VARCHAR(10) NOT NULL DEFAULT 'LEFT',
  test_type VARCHAR(40) NOT NULL DEFAULT 'isometric',
  peak_force NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_force NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  rfd NUMERIC(10,2) NOT NULL DEFAULT 0,
  sensitivity INTEGER NOT NULL DEFAULT 3,
  raw_force_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  sample_rate INTEGER NOT NULL DEFAULT 80,
  device_model VARCHAR(120) NOT NULL DEFAULT 'Tindeq',
  device_firmware VARCHAR(120) NOT NULL DEFAULT '',
  device_battery INTEGER NOT NULL DEFAULT 0,
  measurement_mode VARCHAR(40) NOT NULL DEFAULT 'isometric',
  is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_lab_sessions_org_patient_created
  ON activity_lab_sessions (organization_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_lab_sessions_org_created
  ON activity_lab_sessions (organization_id, created_at DESC);

-- 0036_patient_resources_sync_hotfix.sql
CREATE TABLE IF NOT EXISTS medical_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doctor_name TEXT,
  request_date TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medical_requests
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS doctor_name TEXT,
  ADD COLUMN IF NOT EXISTS request_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_medical_requests_patient_date
  ON medical_requests (organization_id, patient_id, request_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS medical_request_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_request_id UUID NOT NULL REFERENCES medical_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medical_request_files
  ADD COLUMN IF NOT EXISTS medical_request_id UUID,
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS storage_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_medical_request_files_request_created
  ON medical_request_files (medical_request_id, created_at DESC);

-- 0040_worker_schema_batch_two.sql
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
