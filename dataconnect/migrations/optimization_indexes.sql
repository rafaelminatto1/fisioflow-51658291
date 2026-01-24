-- ============================================================================================
-- FISIOFLOW - DATABASE OPTIMIZATION INDEXES
-- ============================================================================================
-- Autor: Rafael Minatto
-- Data: 2026-01-24
-- Descrição: Índices otimizados para consultas no Cloud SQL PostgreSQL
--
-- Notas:
-- - Índices compostos são criados na ordem de seletividade
-- - Partial indexes são usados quando apropriado (para reduzir tamanho)
-- - INCLUDE columns adicionam colunas sem incluir no índice (PostgreSQL 11+)
-- - Índices do tipo GIN são usados para busca em arrays e JSONB
-- ============================================================================================

-- ============================================================================================
-- PATIENTS TABLE INDEXES
-- ============================================================================================

-- Índice para busca rápida por status (muito usado)
CREATE INDEX IF NOT EXISTS idx_patients_status
ON patients(status)
WHERE status IN ('active', 'inactive');

-- Índice para busca por organização (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_patients_organization_status
ON patients(organization_id, status)
WHERE status = 'active';

-- Índice para busca por nome (autocomplete)
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
ON patients USING gin(full_name gin_trgm_ops);

-- Índice para busca por CPF (único)
CREATE INDEX IF NOT EXISTS idx_patients_cpf
ON patients(cpf)
WHERE cpf IS NOT NULL;

-- Índice para busca por email (login)
CREATE INDEX IF NOT EXISTS idx_patients_email
ON patients(email)
WHERE email IS NOT NULL;

-- Índice para busca por telefone (notificações)
CREATE INDEX IF NOT EXISTS idx_patients_phone
ON patients(phone)
WHERE phone IS NOT NULL;

-- Índice composto para dashboard
CREATE INDEX IF NOT EXISTS idx_patients_org_created
ON patients(organization_id, created_at DESC);

-- ============================================================================================
-- APPOINTMENTS TABLE INDEXES
-- ============================================================================================

-- Índice primário para agenda (busca por data)
CREATE INDEX IF NOT EXISTS idx_appointments_date
ON appointments(date, start_time)
WHERE date >= CURRENT_DATE;

-- Índice para agendamentos futuros do paciente
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date
ON appointments(patient_id, date DESC, start_time)
WHERE date >= CURRENT_DATE AND status NOT IN ('cancelado', 'concluido');

-- Índice para agenda do terapeuta
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date
ON appointments(therapist_id, date, start_time)
WHERE date >= CURRENT_DATE;

-- Índice para status específicos
CREATE INDEX IF NOT EXISTS idx_appointments_status
ON appointments(status, date)
WHERE status IN ('agendado', 'confirmado');

-- Índice para busca por status na data
CREATE INDEX IF NOT EXISTS idx_appointments_date_status
ON appointments(date, status, start_time)
WHERE date >= CURRENT_DATE;

-- Índice para relatórios
CREATE INDEX IF NOT EXISTS idx_appointments_created
ON appointments(created_at DESC);

-- ============================================================================================
-- SESSIONS/SOAP TABLE INDEXES
-- ============================================================================================

-- Índice para sessões do paciente
CREATE INDEX IF NOT EXISTS idx_sessions_patient_date
ON sessions(patient_id, session_date DESC)
WHERE status = 'completed';

-- Índice para sessões do terapeuta
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_date
ON sessions(therapist_id, session_date DESC)
WHERE status = 'completed';

-- Índice para sessões por agendamento
CREATE INDEX IF NOT EXISTS idx_sessions_appointment
ON sessions(appointment_id)
WHERE appointment_id IS NOT NULL;

-- ============================================================================================
-- PATIENT PATHOLOGIES TABLE INDEXES
-- ============================================================================================

-- Índice para patologias ativas do paciente
CREATE INDEX IF NOT EXISTS idx_pathologies_patient_status
ON patient_pathologies(patient_id, status)
WHERE status = 'em_tratamento';

-- Índice para patologias por nome (busca)
CREATE INDEX IF NOT EXISTS idx_pathologies_name_trgm
ON patient_pathologies USING gin(pathology_name gin_trgm_ops);

-- ============================================================================================
-- PAYMENTS TABLE INDEXES
-- ============================================================================================

-- Índice para pagamentos do paciente
CREATE INDEX IF NOT EXISTS idx_payments_patient_date
ON payments(patient_id, payment_date DESC);

-- Índice para pagamentos por status
CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status, created_at DESC)
WHERE status = 'pending';

-- Índice para pagamentos por método
CREATE INDEX IF NOT EXISTS idx_payments_method
ON payments(payment_method, created_at DESC);

-- Índice para relatórios financeiros
CREATE INDEX IF NOT EXISTS idx_payments_date_status
ON payments(payment_date DESC, status)
WHERE payment_date IS NOT NULL;

-- ============================================================================================
-- EXERCISES TABLE INDEXES
-- ============================================================================================

-- Índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_exercises_category
ON exercises(category, name)
WHERE deleted_at IS NULL;

-- Índice para busca por dificuldade
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty
ON exercises(difficulty, category)
WHERE deleted_at IS NULL;

-- Índice full-text search para exercícios
CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm
ON exercises USING gin(name gin_trgm_ops)
WHERE deleted_at IS NULL;

-- Índice para busca por tags
CREATE INDEX IF NOT EXISTS idx_exercises_tags
ON exercises USING gin(tags)
WHERE deleted_at IS NULL;

-- ============================================================================================
-- EXERCISE PLANS TABLE INDEXES
-- ============================================================================================

-- Índice para planos do paciente
CREATE INDEX IF NOT EXISTS idx_exercise_plans_patient
ON exercise_plans(patient_id, created_at DESC)
WHERE active = true;

-- Índice para planos do terapeuta
CREATE INDEX IF NOT EXISTS idx_exercise_plans_therapist
ON exercise_plans(therapist_id, created_at DESC)
WHERE active = true;

-- ============================================================================================
-- EVOLUTIONS TABLE INDEXES
-- ============================================================================================

-- Índice para evoluções do paciente
CREATE INDEX IF NOT EXISTS idx_evolutions_patient_date
ON evolutions(patient_id, created_at DESC);

-- Índice para evoluções por tipo
CREATE INDEX IF NOT EXISTS idx_evolutions_type
ON evolutions(type, created_at DESC);

-- ============================================================================================
-- EVALUATIONS TABLE INDEXES
-- ============================================================================================

-- Índice para avaliações do paciente
CREATE INDEX IF NOT EXISTS idx_evaluations_patient_date
ON evaluations(patient_id, created_at DESC);

-- Índice para avaliações por formulário
CREATE INDEX IF NOT EXISTS idx_evaluations_form
ON evaluations(form_id, created_at DESC);

-- ============================================================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================================================

-- Índice para notificações do usuário
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, read_at, created_at DESC)
WHERE read_at IS NULL;

-- Índice para notificações por tipo
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(type, created_at DESC);

-- ============================================================================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================================================================

-- Índice para logs por usuário
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs(user_id, timestamp DESC);

-- Índice para logs por ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action, timestamp DESC);

-- Índice para logs por data (limpeza)
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs(timestamp DESC);

-- Partial index para logs recentes (últimos 90 dias)
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
ON audit_logs(user_id, action, timestamp DESC)
WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days';

-- ============================================================================================
-- VOUCHERS TABLE INDEXES
-- ============================================================================================

-- Índice para vouchers do usuário
CREATE INDEX IF NOT EXISTS idx_vouchers_user
ON vouchers(user_id, created_at DESC)
WHERE status IN ('active', 'pending');

-- Índice para vouchers por código
CREATE INDEX IF NOT EXISTS idx_vouchers_code
ON vouchers(code)
WHERE status = 'active';

-- Índice para vouchers por status
CREATE INDEX IF NOT EXISTS idx_vouchers_status
ON vouchers(status, expires_at)
WHERE status IN ('active', 'pending');

-- ============================================================================================
-- EVENTS TABLE INDEXES
-- ============================================================================================

-- Índice para eventos por organização
CREATE INDEX IF NOT EXISTS idx_events_org_date
ON events(organization_id, start_date DESC)
WHERE cancelled_at IS NULL;

-- Índice para eventos por criador
CREATE INDEX IF NOT EXISTS idx_events_creator
ON events(created_by, created_at DESC);

-- ============================================================================================
-- TEXT SEARCH CONFIGURATION
-- ============================================================================================

-- Criar extensão para busca de texto (se não existir)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Criar extensão para busca full-text
CREATE EXTENSION IF NOT EXISTS tsvector;

-- Configurar busca full-text para pacientes
ALTER TABLE patients ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(email, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(phone, '')), 'C')
  ) STORED;

-- Índice para busca full-text em pacientes
CREATE INDEX IF NOT EXISTS idx_patients_search
ON patients USING gin(search_tsv);

-- Configurar busca full-text para exercícios
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(instructions, '')), 'C')
  ) STORED;

-- Índice para busca full-text em exercícios
CREATE INDEX IF NOT EXISTS idx_exercises_search
ON exercises USING gin(search_tsv);

-- ============================================================================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================================================================

-- Índice para pacientes ativos (apenas ativos - menor índice)
CREATE INDEX IF NOT EXISTS idx_patients_active_only
ON patients(organization_id, full_name)
WHERE status = 'active' AND deleted_at IS NULL;

-- Índice para agendamentos futuros (apenas futuros)
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming
ON appointments(patient_id, date, start_time)
WHERE date >= CURRENT_DATE AND status NOT IN ('cancelado', 'concluido');

-- Índice para pagamentos pendentes (apenas pendentes)
CREATE INDEX IF NOT EXISTS idx_payments_pending_only
ON payments(patient_id, created_at)
WHERE status = 'pending';

-- ============================================================================================
-- COVERING INDEXES (INCLUDE)
-- ============================================================================================

-- Índice cobridor para agenda (inclui dados frequentemente acessados)
CREATE INDEX IF NOT EXISTS idx_appointments_schedule_covering
ON appointments(therapist_id, date, start_time)
INCLUDE (patient_id, status, type)
WHERE date >= CURRENT_DATE;

-- Índice cobridor para lista de pacientes (inclui dados principais)
CREATE INDEX IF NOT EXISTS idx_patients_list_covering
ON patients(organization_id, status)
INCLUDE (full_name, email, phone)
WHERE status = 'active';

-- ============================================================================================
-- STATISTICS UPDATE
-- ============================================================================================

-- Atualizar estatísticas do banco
ANALYZE patients;
ANALYZE appointments;
ANALYZE sessions;
ANALYZE payments;
ANALYZE exercises;
ANALYZE evolutions;
ANALYZE evaluations;
ANALYZE audit_logs;
ANALYZE notifications;

-- ============================================================================================
-- MAINTENANCE QUERIES
-- ============================================================================================

-- Verificar tamanho dos índices
/*
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- Verificar uso dos índices
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
*/

-- Verificar índices não utilizados
/*
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
*/
