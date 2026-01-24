/**
 * Cloud SQL Migration Script
 * Cria schema completo no Cloud SQL PostgreSQL
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const CLOUD_SQL_CONNECTION_STRING = process.env.CLOUD_SQL_CONNECTION_STRING;

if (!CLOUD_SQL_CONNECTION_STRING) {
  console.error('❌ CLOUD_SQL_CONNECTION_STRING não configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: CLOUD_SQL_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
});

/**
 * SQL Schema completo para FisioFlow
 */
const SCHEMA_SQL = `
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
CREATE TYPE user_role AS ENUM ('admin', 'fisioterapeuta', 'recepcionista', 'estagiario', 'paciente');
CREATE TYPE appointment_status AS ENUM ('agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'paciente_faltou');
CREATE TYPE session_type AS ENUM ('individual', 'dupla', 'grupo');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'transfer', 'check');
CREATE TYPE patient_status AS ENUM ('Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido');
CREATE TYPE exercise_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE exercise_category AS ENUM ('fortalecimento', 'alongamento', 'mobilidade', 'cardio', 'equilibrio', 'respiratorio', 'postura', 'coordenacao');

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
  chief_complaint TEXT NOT NULL,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  surgical_history TEXT,
  current_medications JSONB,
  allergies TEXT,
  family_history TEXT,
  lifestyle JSONB,
  habits JSONB,
  physical_examination JSONB NOT NULL,
  primary_diagnosis TEXT,
  secondary_diagnoses JSONB,
  treatment_plan TEXT,
  prognosis TEXT,
  notes TEXT,
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
  notes TEXT,
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

-- ============================================
-- ÍNDICES
-- ============================================

-- FTS
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
  USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY appointments_org_policy ON appointments
  FOR ALL
  USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY exercises_org_policy ON exercises
  FOR SELECT
  USING (is_active = true);

CREATE POLICY medical_records_org_policy ON medical_records
  FOR ALL
  USING (organization_id = current_setting('app.organization_id')::uuid);

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
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Insert some basic exercise categories if not exists
`;

/**
 * Executa o schema SQL no Cloud SQL
 */
async function runSchema() {
  console.log('🔧 Executando schema SQL no Cloud SQL...');

  const client = await pool.connect();

  try {
    await client.query(SCHEMA_SQL);
    console.log('✅ Schema criado com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro ao criar schema:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('\n========================================');
  console.log('  MIGRAÇÃO DO SCHEMA CLOUD SQL');
  console.log('========================================\n');

  await runSchema();

  console.log('\n✅ Schema Cloud SQL migrado com sucesso!\n');

  await pool.end();
}

main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
