-- ============================================
-- FISIOFLOW CLOUD SQL SCHEMA
-- PostgreSQL 15 + pgvector + pg_trgm
-- ============================================

-- ============================================
-- EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================
-- TIPOS ENUM
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'fisioterapeuta', 'recepcionista', 'estagiario', 'paciente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'paciente_faltou');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('individual', 'dupla', 'grupo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'transfer', 'check');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE patient_status AS ENUM ('Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exercise_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exercise_category AS ENUM ('fortalecimento', 'alongamento', 'mobilidade', 'cardio', 'equilibrio', 'respiratorio', 'postura', 'coordenacao');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  address JSONB,
  subscription_status TEXT DEFAULT 'trial',
  plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#667eea',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  language TEXT DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (usuários Firebase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'fisioterapeuta',
  crefito TEXT,
  specialties JSONB DEFAULT '[]'::jsonb,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PACIENTES
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  birth_date DATE NOT NULL,
  gender TEXT,
  address TEXT,
  emergency_contact TEXT,
  medical_history TEXT,
  main_condition TEXT NOT NULL,
  status patient_status DEFAULT 'Inicial',
  progress INTEGER DEFAULT 0,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES profiles(user_id),
  is_active BOOLEAN DEFAULT true,
  referring_doctor_name TEXT,
  referring_doctor_phone TEXT,
  medical_return_date DATE,
  medical_report_done BOOLEAN DEFAULT false,
  medical_report_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENDAMENTOS
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id TEXT NOT NULL REFERENCES profiles(user_id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status DEFAULT 'agendado',
  session_type session_type DEFAULT 'individual',
  notes TEXT,
  cancellation_reason TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_end_time CHECK (end_time > start_time)
);

-- EXERCÍCIOS
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category exercise_category NOT NULL,
  description TEXT NOT NULL,
  instructions JSONB NOT NULL,
  muscles JSONB NOT NULL,
  equipment TEXT NOT NULL DEFAULT 'nenhum',
  difficulty exercise_difficulty NOT NULL DEFAULT 'easy',
  video_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  sets_recommended TEXT,
  reps_recommended TEXT,
  precautions TEXT,
  benefits TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  embedding VECTOR(1536),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  language TEXT DEFAULT 'pt',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLANOS DE EXERCÍCIO
CREATE TABLE IF NOT EXISTS exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  target_end_date DATE,
  actual_end_date DATE,
  status TEXT DEFAULT 'ativo',
  created_by TEXT NOT NULL REFERENCES profiles(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ITENS DE PLANO DE EXERCÍCIO
CREATE TABLE IF NOT EXISTS exercise_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0 NOT NULL,
  sets INTEGER,
  reps TEXT,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  load TEXT,
  notes TEXT,
  frequency_weekly INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRONTUÁRIOS
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES profiles(user_id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT NOT NULL,
  content TEXT,
  record_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSÕES DE TRATAMENTO
CREATE TABLE IF NOT EXISTS treatment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id TEXT NOT NULL REFERENCES profiles(user_id),
  appointment_id UUID REFERENCES appointments(id),
  exercise_plan_id UUID REFERENCES exercise_plans(id),
  session_date DATE DEFAULT CURRENT_DATE,
  start_time TIME DEFAULT NOW(),
  end_time TIME,
  duration_minutes INTEGER,
  session_type TEXT DEFAULT 'tratamento',
  subjective TEXT,
  objective JSONB,
  assessment TEXT,
  plan TEXT,
  procedures JSONB,
  exercises_prescribed JSONB,
  evolution TEXT,
  treatment_response TEXT,
  pain_level_before INTEGER,
  pain_level_after INTEGER,
  observations TEXT,
  next_session_goals TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAGAMENTOS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  amount_cents INTEGER NOT NULL,
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  payment_date DATE,
  payment_time TIME,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notes TEXT,
  receipt_url TEXT,
  gateway_transaction_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PACOTES DE SESSÕES
CREATE TABLE IF NOT EXISTS patient_session_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sessions_count INTEGER NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  amount_cents INTEGER NOT NULL,
  purchase_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VOUCHERS
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value INTEGER NOT NULL,
  min_sessions INTEGER DEFAULT 1,
  max_uses INTEGER DEFAULT 0,
  uses_count INTEGER DEFAULT 0,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEMPLATES DE AVALIAÇÃO
CREATE TABLE IF NOT EXISTS assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÕES DE AVALIAÇÃO
CREATE TABLE IF NOT EXISTS assessment_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0 NOT NULL,
  section_type TEXT DEFAULT 'questions',
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERGUNTAS DE AVALIAÇÃO
CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  is_required BOOLEAN DEFAULT false,
  options JSONB,
  min_value INTEGER,
  max_value INTEGER,
  unit TEXT,
  help_text TEXT,
  placeholder TEXT,
  validations JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AVALIAÇÕES DE PACIENTE
CREATE TABLE IF NOT EXISTS patient_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES assessment_templates(id),
  title TEXT NOT NULL,
  assessment_date DATE NOT NULL,
  performed_by TEXT NOT NULL REFERENCES profiles(user_id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  general_notes TEXT,
  conclusion TEXT,
  recommendations TEXT,
  next_assessment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RESPOSTAS DE AVALIAÇÃO
CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES patient_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assessment_questions(id),
  answer_text TEXT,
  answer_number INTEGER,
  answer_json JSONB,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROGRESSO DO PACIENTE
CREATE TABLE IF NOT EXISTS patient_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  pain_level INTEGER,
  vas_score INTEGER,
  physical_function INTEGER,
  quality_of_life INTEGER,
  muscle_strength INTEGER,
  range_of_motion JSONB,
  functional_tests JSONB,
  custom_metrics JSONB,
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recorded_by TEXT NOT NULL REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANEXOS DO PRONTUÁRIO
CREATE TABLE IF NOT EXISTS medical_record_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  attachment_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_date DATE,
  category TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONVITES
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by TEXT NOT NULL REFERENCES profiles(user_id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id TEXT,
  user_id TEXT REFERENCES profiles(user_id),
  organization_id UUID REFERENCES organizations(id),
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FINANCIAL SUMMARIES
CREATE TABLE IF NOT EXISTS patient_financial_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_paid_cents INTEGER DEFAULT 0,
  individual_sessions_paid INTEGER DEFAULT 0,
  package_sessions_total INTEGER DEFAULT 0,
  package_sessions_used INTEGER DEFAULT 0,
  package_sessions_available INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVOLUCOES (SOAP Notes)
CREATE TABLE IF NOT EXISTS evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id TEXT NOT NULL REFERENCES profiles(user_id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  pain_level INTEGER,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

-- FTS (Full Text Search)
CREATE INDEX IF NOT EXISTS idx_patients_tsv ON patients USING GIN(to_tsvector('portuguese', name || ' ' || COALESCE(email, '') || ' ' || COALESCE(main_condition, '')));
CREATE INDEX IF NOT EXISTS idx_exercises_tsv ON exercises USING GIN(to_tsvector('portuguese', name || ' ' || description));

-- Trigram
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm ON exercises USING GIN (name gin_trgm_ops);

-- Vector (pgvector)
CREATE INDEX IF NOT EXISTS exercises_embedding_idx ON exercises USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Performance
CREATE INDEX IF NOT EXISTS idx_patients_org_status ON patients(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date ON appointments(therapist_id, date) WHERE date >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_date ON treatment_sessions(patient_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_category_difficulty ON exercises(category, difficulty);

-- Unique constraint for appointments
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_time_conflict
ON appointments(therapist_id, date, start_time, end_time)
WHERE status NOT IN ('cancelado', 'paciente_faltou');

-- ============================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Simplified RLS policies (em produção, usar autenticação Firebase para verificar)
CREATE POLICY patients_org_policy ON patients
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY appointments_org_policy ON appointments
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY exercises_org_policy ON exercises
  FOR SELECT
  USING (is_active = true);

CREATE POLICY medical_records_org_policy ON medical_records
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY exercise_plans_org_policy ON exercise_plans
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY payments_org_policy ON payments
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- ============================================
-- FUNÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_records_updated_at ON medical_records;
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar conflito de agendamento
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_therapist_id TEXT,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_conflict INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_conflict
  FROM appointments
  WHERE therapist_id = p_therapist_id
    AND date = p_date
    AND status NOT IN ('cancelado', 'paciente_faltou')
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    );

  RETURN v_conflict > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DADOS INICIAIS
-- ============================================

INSERT INTO organizations (id, name, email, subscription_status, plan) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Clínica Demo', 'demo@fisioflow.com', 'active', 'free')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MISSING CLINICAL TABLES (Added during migration)
-- ============================================

-- SOAP RECORDS
CREATE TABLE IF NOT EXISTS soap_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  session_number INTEGER,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  status soap_status NOT NULL DEFAULT 'draft',
  pain_level INTEGER,
  pain_location TEXT,
  pain_character TEXT,
  duration_minutes INTEGER,
  last_auto_save_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  finalized_by TEXT REFERENCES profiles(user_id),
  record_date DATE DEFAULT CURRENT_DATE,
  created_by TEXT NOT NULL REFERENCES profiles(user_id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ,
  signature_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSION ATTACHMENTS
CREATE TABLE IF NOT EXISTS session_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soap_record_id UUID REFERENCES soap_records(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_type TEXT,
  mime_type TEXT,
  category TEXT,
  size_bytes INTEGER,
  description TEXT,
  uploaded_by TEXT REFERENCES profiles(user_id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSION TEMPLATES
CREATE TABLE IF NOT EXISTS session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  therapist_id TEXT REFERENCES profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  subjective TEXT,
  objective JSONB,
  assessment TEXT,
  plan JSONB,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENT DOCUMENTS
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT NOT NULL DEFAULT 'outro',
  description TEXT,
  uploaded_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENT EXAMS
CREATE TABLE IF NOT EXISTS patient_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_date DATE,
  exam_type TEXT,
  description TEXT,
  created_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENT EXAM FILES
CREATE TABLE IF NOT EXISTS patient_exam_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES patient_exams(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENT PAIN RECORDS (Detailed history)
CREATE TABLE IF NOT EXISTS patient_pain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pain_level INTEGER NOT NULL,
  pain_type TEXT,
  body_part TEXT,
  notes TEXT,
  created_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGERS PARA NOVAS TABELAS
CREATE TRIGGER update_soap_records_updated_at BEFORE UPDATE ON soap_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_templates_updated_at BEFORE UPDATE ON session_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_documents_updated_at BEFORE UPDATE ON patient_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_exams_updated_at BEFORE UPDATE ON patient_exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_pain_records_updated_at BEFORE UPDATE ON patient_pain_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
