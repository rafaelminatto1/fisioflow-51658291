-- Reconciliacao do drift residual entre rotas do Worker e schema real do Neon.

CREATE TABLE IF NOT EXISTS atestado_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  conteudo TEXT NOT NULL,
  variaveis_disponiveis JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atestado_templates_org_nome
  ON atestado_templates (organization_id, nome);

CREATE TABLE IF NOT EXISTS contrato_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'outro',
  conteudo TEXT NOT NULL,
  variaveis_disponiveis JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrato_templates_org_nome
  ON contrato_templates (organization_id, nome);

CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID,
  appointment_id UUID,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_org_created
  ON communication_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_org_type_status
  ON communication_logs (organization_id, type, status);

CREATE INDEX IF NOT EXISTS idx_communication_logs_patient
  ON communication_logs (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT NOT NULL DEFAULT 'outro',
  description TEXT,
  storage_url TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_created
  ON patient_documents (organization_id, patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_date TIMESTAMPTZ,
  exam_type TEXT,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_exams_patient_date
  ON patient_exams (organization_id, patient_id, exam_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_exam_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES patient_exams(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_exam_files_exam_created
  ON patient_exam_files (exam_id, created_at DESC);

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_created
  ON security_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  organization_id UUID,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_method TEXT,
  backup_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  pending_otp_code TEXT,
  pending_otp_expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_settings_org_user
  ON mfa_settings (organization_id, user_id);

CREATE TABLE IF NOT EXISTS mfa_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id UUID,
  factor_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  friendly_name TEXT,
  secret TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mfa_enrollments_user_created
  ON mfa_enrollments (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lgpd_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lgpd_consents_user_type_unique UNIQUE (user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_lgpd_consents_user_updated
  ON lgpd_consents (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_hash TEXT NOT NULL,
  age_group TEXT NOT NULL DEFAULT 'unknown',
  gender TEXT NOT NULL DEFAULT 'unknown',
  primary_pathology TEXT NOT NULL DEFAULT 'unknown',
  chronic_condition BOOLEAN NOT NULL DEFAULT false,
  baseline_pain_level NUMERIC(10,2) NOT NULL DEFAULT 0,
  baseline_functional_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  treatment_type TEXT NOT NULL DEFAULT 'physical_therapy',
  session_frequency_weekly NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  attendance_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  home_exercise_compliance NUMERIC(10,4) NOT NULL DEFAULT 0,
  portal_login_frequency NUMERIC(10,4) NOT NULL DEFAULT 0,
  outcome_category TEXT NOT NULL DEFAULT 'partial',
  sessions_to_discharge INTEGER NOT NULL DEFAULT 0,
  pain_reduction_percentage NUMERIC(10,2) NOT NULL DEFAULT 0,
  functional_improvement_percentage NUMERIC(10,2) NOT NULL DEFAULT 0,
  patient_satisfaction_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_collection_period_start TIMESTAMPTZ,
  data_collection_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_training_data_org_hash
  ON ml_training_data (organization_id, patient_hash);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_org_pathology
  ON ml_training_data (organization_id, primary_pathology);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_org_created_at
  ON ml_training_data (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id UUID NOT NULL,
  task_id UUID,
  patient_id UUID,
  project_id UUID,
  appointment_id UUID,
  description TEXT NOT NULL DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate NUMERIC(10,2),
  total_value NUMERIC(10,2),
  tags TEXT[] NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_org_user
  ON time_entries (organization_id, user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_patient
  ON time_entries (patient_id, start_time DESC);

CREATE TABLE IF NOT EXISTS timer_drafts (
  user_id TEXT PRIMARY KEY,
  timer JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  automation_id TEXT,
  automation_name TEXT,
  event_type TEXT NOT NULL DEFAULT 'execution',
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_org_started
  ON automation_logs (organization_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_logs_org_status
  ON automation_logs (organization_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text',
  attachment_url TEXT,
  attachment_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_status
  ON messages (recipient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_participants_created
  ON messages (sender_id, recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS exercise_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id TEXT,
  organization_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  file_size BIGINT NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'fortalecimento',
  difficulty TEXT NOT NULL DEFAULT 'iniciante',
  body_parts TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_videos_org_created
  ON exercise_videos (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_videos_exercise_created
  ON exercise_videos (exercise_id, created_at DESC);

CREATE TABLE IF NOT EXISTS feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'nacional',
  recorrente BOOLEAN NOT NULL DEFAULT true,
  bloqueia_agenda BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feriados_org_data
  ON feriados (organization_id, data ASC);

CREATE TABLE IF NOT EXISTS goal_profiles (
  id TEXT PRIMARY KEY,
  organization_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  applicable_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_gate JSONB,
  targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  clinician_notes_template TEXT,
  patient_notes_template TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_pinned_metric_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_profiles_org_status
  ON goal_profiles (organization_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS gamification_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'quest_complete',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  points INTEGER,
  badge_id TEXT,
  level_up BOOLEAN NOT NULL DEFAULT false,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gamification_notifications_patient_created
  ON gamification_notifications (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gamification_notifications_patient_read
  ON gamification_notifications (patient_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS gamification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quest_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  points_reward INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'daily',
  difficulty TEXT NOT NULL DEFAULT 'easy',
  is_active BOOLEAN NOT NULL DEFAULT true,
  repeat_interval TEXT NOT NULL DEFAULT 'daily',
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_definitions_code
  ON quest_definitions (code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quest_definitions_active_created
  ON quest_definitions (is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  point_reward INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_challenges_active_dates
  ON weekly_challenges (is_active, start_date DESC, end_date DESC);

CREATE TABLE IF NOT EXISTS patient_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patient_challenges_patient_challenge_unique UNIQUE (patient_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_challenges_patient_completed
  ON patient_challenges (patient_id, completed, updated_at DESC);

CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'consumable',
  icon TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_items_code
  ON shop_items (code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_items_active_cost
  ON shop_items (is_active, cost ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  item_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_inventory_user_item_unique UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user_updated
  ON user_inventory (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  user_id TEXT NOT NULL,
  organization_id TEXT,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  device_info JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint_user
  ON push_subscriptions (endpoint, user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON push_subscriptions (user_id, active);

CREATE TABLE IF NOT EXISTS waitlist_offers (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  organization_id TEXT NOT NULL,
  waitlist_id TEXT NOT NULL,
  offered_slot TEXT NOT NULL,
  response TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  expiration_time TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_offers_org_waitlist
  ON waitlist_offers (organization_id, waitlist_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recurring_series (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  organization_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  therapist_id TEXT,
  recurrence_type TEXT NOT NULL DEFAULT 'weekly',
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  recurrence_days_of_week JSONB,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER,
  appointment_type TEXT,
  notes TEXT,
  auto_confirm BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_series_org_patient
  ON recurring_series (organization_id, patient_id, is_active);

CREATE TABLE IF NOT EXISTS prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  contato TEXT,
  cpf_cnpj TEXT,
  valor_acordado NUMERIC(12,2) NOT NULL DEFAULT 0,
  status_pagamento TEXT NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prestadores_evento_created
  ON prestadores (evento_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prestadores_evento_status
  ON prestadores (evento_id, status_pagamento, updated_at DESC);

CREATE TABLE IF NOT EXISTS recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  numero_recibo BIGINT NOT NULL,
  patient_id UUID,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_extenso TEXT,
  referente TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  emitido_por TEXT,
  cpf_cnpj_emitente TEXT,
  assinado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recibos_org_numero_unique UNIQUE (organization_id, numero_recibo)
);

CREATE INDEX IF NOT EXISTS idx_recibos_org_numero
  ON recibos (organization_id, numero_recibo DESC);
