-- ============================================================
-- MIGRATION: Performance Indexes for Cloud SQL
-- ============================================================
-- This migration creates indexes to optimize query performance
-- for the FisioFlow application.
-- ============================================================

-- Enable pg_trgm extension for ILIKE optimization (search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PATIENTS TABLE INDEXES
-- ============================================================================

-- Composite index for listPatients query (organization_id + is_active + status)
CREATE INDEX IF NOT EXISTS idx_patients_org_active_status
ON patients(organization_id, is_active, status)
WHERE is_active = true;

-- GIN indexes for search optimization (ILIKE operations)
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
ON patients USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_cpf_trgm
ON patients USING gin(cpf gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_email_trgm
ON patients USING gin(email gin_trgm_ops);

-- Index for profile_id lookups
CREATE INDEX IF NOT EXISTS idx_patients_profile_id
ON patients(profile_id) WHERE profile_id IS NOT NULL;

-- ============================================================================
-- APPOINTMENTS TABLE INDEXES
-- ============================================================================

-- Composite index for appointment listing with status filter
CREATE INDEX IF NOT EXISTS idx_appointments_org_date_status
ON appointments(organization_id, appointment_date DESC, appointment_time)
WHERE status NOT IN ('cancelado', 'remarcado', 'paciente_faltou');

-- Index for patient appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_org_status
ON appointments(patient_id, organization_id, appointment_date DESC);

-- Index for therapist availability queries
CREATE INDEX IF NOT EXISTS idx_appointments_professional_org_status
ON appointments(professional_id, organization_id, appointment_date, appointment_time);

-- Composite index for time conflict checks
CREATE INDEX IF NOT EXISTS idx_appointments_org_datetime
ON appointments(organization_id, appointment_date, appointment_time)
WHERE status IN ('agendado', 'confirmado');

-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_org_id
ON profiles(organization_id) WHERE organization_id IS NOT NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
ON profiles USING gin(email gin_trgm_ops);

-- ============================================================================
-- TREATMENT SESSIONS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_org_date
ON treatment_sessions(patient_id, organization_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_treatment_sessions_therapist_org
ON treatment_sessions(therapist_id, organization_id);

-- Index for appointment association
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_appointment
ON treatment_sessions(appointment_id) WHERE appointment_id IS NOT NULL;

-- ============================================================================
-- PAIN RECORDS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pain_records_patient_org_date
ON pain_records(patient_id, organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pain_records_body_part
ON pain_records(body_part) WHERE body_part IS NOT NULL;

-- ============================================================================
-- PATIENT ASSESSMENTS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_assessments_patient_org_date
ON patient_assessments(patient_id, organization_id, assessment_date DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_template_org
ON patient_assessments(template_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_assessments_status_org
ON patient_assessments(status, organization_id);

-- ============================================================================
-- PAYMENTS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_patient_org_date
ON payments(patient_id, organization_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_org_status_date
ON payments(organization_id, status, payment_date DESC);

-- Index for appointment payments
CREATE INDEX IF NOT EXISTS idx_payments_appointment
ON payments(appointment_id) WHERE appointment_id IS NOT NULL;

-- ============================================================================
-- TRANSACTIONS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transacoes_org_created
ON transacoes(organization_id, created_at DESC);

-- Index for metadata queries (appointment_id lookups)
CREATE INDEX IF NOT EXISTS idx_transacoes_metadata_appointment
ON transacoes USING gin((metadata->>'appointment_id') gin_trgm_ops)
WHERE (metadata->>'appointment_id') IS NOT NULL;

-- Index for tipo queries
CREATE INDEX IF NOT EXISTS idx_transacoes_org_tipo
ON transacoes(organization_id, tipo, created_at DESC);

-- ============================================================================
-- WHATSAPP MESSAGES TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org_created
ON whatsapp_messages(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient_org
ON whatsapp_messages(patient_id, organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status
ON whatsapp_messages(status, created_at DESC)
WHERE status != 'sent';

-- ============================================================================
-- PRESCRIPTION EXERCISES TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_patient_org
ON prescribed_exercises(patient_id, organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_exercise_org
ON prescribed_exercises(exercise_id, organization_id);

-- ============================================================================
-- EXERCISE LOGS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_exercise_logs_patient_org_date
ON exercise_logs(patient_id, organization_id, performed_at DESC);

-- ============================================================================
-- EVOLUTIONS (SOAP RECORDS) TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_evolutions_patient_org_date
ON evolutions(patient_id, organization_id, created_at DESC);

-- ============================================================================
-- MEDICAL RECORDS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_org_date
ON medical_records(patient_id, organization_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_medical_records_type_org
ON medical_records(type, organization_id);

-- ============================================================================
-- NOTIFICATION QUEUE TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notification_queue_status_scheduled
ON notification_queue(status, scheduled_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status
ON notification_queue(user_id, status, scheduled_at)
WHERE status = 'pending';

-- ============================================================================
-- BACKGROUND JOBS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created
ON background_jobs(status, created_at DESC)
WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status
ON background_jobs(job_type, status);

-- ============================================================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date
ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date
ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resolved
ON audit_logs(resolved, created_at DESC);

-- ============================================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- ============================================================================

ANALYZE patients;
ANALYZE appointments;
ANALYZE profiles;
ANALYZE treatment_sessions;
ANALYZE pain_records;
ANALYZE patient_assessments;
ANALYZE payments;
ANALYZE transacoes;
ANALYZE whatsapp_messages;
ANALYZE prescribed_exercises;
ANALYZE exercise_logs;
ANALYZE evolutions;
ANALYZE medical_records;
ANALYZE notification_queue;
ANALYZE background_jobs;
ANALYZE audit_logs;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: All indexes listed above should exist
