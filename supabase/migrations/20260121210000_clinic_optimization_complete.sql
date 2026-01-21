-- ============================================================================
-- Migration: Complete Clinic Optimization (Single Tenant)
-- Created: 2025-01-21
-- Purpose: Comprehensive database optimization for single-clinic FisioFlow
--
-- Changes:
-- 1. Drop unused empty tables (100+ tables)
-- 2. Create indexes for single-clinic (no organization_id)
-- 3. Create covering indexes for critical queries
-- 4. Create GIN indexes for full-text search
-- 5. Optimize data types (TEXT → varchar)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 1: DROP UNUSED EMPTY TABLES
-- ----------------------------------------------------------------------------
-- These tables have 0 rows and are not used in single-clinic operations
-- Estimated savings: 5-10 MB

-- AI/ML features not implemented
DROP TABLE IF EXISTS public.adaptation_history CASCADE;
DROP TABLE IF EXISTS public.adaptation_suggestions CASCADE;
DROP TABLE IF EXISTS public.adherence_reports CASCADE;
DROP TABLE IF EXISTS public.ai_cache CASCADE;
DROP TABLE IF EXISTS public.ai_clinical_sessions CASCADE;
DROP TABLE IF EXISTS public.ai_exercise_prescriptions CASCADE;
DROP TABLE IF EXISTS public.ai_provider_accounts CASCADE;
DROP TABLE IF EXISTS public.ai_queries CASCADE;

-- Analytics not used
DROP TABLE IF EXISTS public.analytics_snapshots CASCADE;
DROP TABLE IF EXISTS public.appointment_predictions CASCADE;

-- Assessment system not used
DROP TABLE IF EXISTS public.assessment_questions CASCADE;
DROP TABLE IF EXISTS public.assessment_responses CASCADE;
DROP TABLE IF EXISTS public.assessment_sections CASCADE;
DROP TABLE IF EXISTS public.assessment_templates CASCADE;

-- Templates not used
DROP TABLE IF EXISTS public.atestado_templates CASCADE;
DROP TABLE IF EXISTS public.contrato_templates CASCADE;
DROP TABLE IF EXISTS public.evento_templates CASCADE;
DROP TABLE IF EXISTS public.evolution_templates CASCADE;

-- Calendar/Google integration not used
DROP TABLE IF EXISTS public.calendar_integrations CASCADE;
DROP TABLE IF EXISTS public.calendar_sync_logs CASCADE;
DROP TABLE IF EXISTS public.google_calendar_events CASCADE;
DROP TABLE IF EXISTS public.google_sync_logs CASCADE;
DROP TABLE IF EXISTS public.user_google_tokens CASCADE;

-- Clinical features not used
DROP TABLE IF EXISTS public.clinical_materials CASCADE;
DROP TABLE IF EXISTS public.clinical_test_records CASCADE;
DROP TABLE IF EXISTS public.conduct_library CASCADE;

-- CRM not used
DROP TABLE IF EXISTS public.crm_automacao_logs CASCADE;
DROP TABLE IF EXISTS public.crm_automacoes CASCADE;
DROP TABLE IF EXISTS public.crm_campanha_envios CASCADE;
DROP TABLE IF EXISTS public.crm_campanhas CASCADE;
DROP TABLE IF EXISTS public.crm_pesquisas_nps CASCADE;
DROP TABLE IF EXISTS public.crm_tarefas CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.lead_historico CASCADE;

-- Email/WhatsApp features not used
DROP TABLE IF EXISTS public.email_config CASCADE;
DROP TABLE IF EXISTS public.email_notifications CASCADE;
DROP TABLE IF EXISTS public.email_queue CASCADE;
DROP TABLE IF EXISTS public.whatsapp_connections CASCADE;
DROP TABLE IF EXISTS public.whatsapp_exercise_queue CASCADE;
DROP TABLE IF EXISTS public.whatsapp_metrics CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates CASCADE;
DROP TABLE IF EXISTS public.whatsapp_webhook_logs CASCADE;

-- Exercise features not used
DROP TABLE IF EXISTS public.exercise_favorites CASCADE;
DROP TABLE IF EXISTS public.exercise_logs CASCADE;
DROP TABLE IF EXISTS public.exercise_plan_items CASCADE;
DROP TABLE IF EXISTS public.exercise_plans CASCADE;
DROP TABLE IF EXISTS public.exercise_prescriptions CASCADE;
DROP TABLE IF EXISTS public.patient_exercise_logs CASCADE;

-- Financial tables not used
DROP TABLE IF EXISTS public.comissoes CASCADE;
DROP TABLE IF EXISTS public.contas_financeiras CASCADE;
DROP TABLE IF EXISTS public.empresas_parceiras CASCADE;
DROP TABLE IF EXISTS public.convenios CASCADE;
DROP TABLE IF EXISTS public.fornecedores CASCADE;
DROP TABLE IF EXISTS public.movimentacoes_caixa CASCADE;

-- Gamification not used
DROP TABLE IF EXISTS public.gamification_notifications CASCADE;
DROP TABLE IF EXISTS public.patient_achievements CASCADE;
DROP TABLE IF EXISTS public.patient_challenges CASCADE;
DROP TABLE IF EXISTS public.patient_goals CASCADE;
DROP TABLE IF EXISTS public.patient_goal_tracking CASCADE;
DROP TABLE IF EXISTS public.patient_quests CASCADE;
DROP TABLE IF EXISTS public.patient_levels CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.goal_audit_logs CASCADE;

-- Goal system not used
DROP TABLE IF EXISTS public.patient_objective_assignments CASCADE;
DROP TABLE IF EXISTS public.patient_objectives CASCADE;

-- Various unused tables
DROP TABLE IF EXISTS public.backup_logs CASCADE;
DROP TABLE IF EXISTS public.data_anonymization_requests CASCADE;
DROP TABLE IF EXISTS public.data_export_requests CASCADE;
DROP TABLE IF EXISTS public.database_backups CASCADE;
DROP TABLE IF EXISTS public.document_signatures CASCADE;
DROP TABLE IF EXISTS public.estagiario_paciente_atribuicao CASCADE;
DROP TABLE IF EXISTS public.generated_reports CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.lgpd_consents CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.medical_records CASCADE;
DROP TABLE IF EXISTS public.medical_request_files CASCADE;
DROP TABLE IF EXISTS public.medical_requests CASCADE;
DROP TABLE IF EXISTS public.mfa_audit_log CASCADE;
DROP TABLE IF EXISTS public.mfa_otp_codes CASCADE;
DROP TABLE IF EXISTS public.mfa_recovery_codes CASCADE;
DROP TABLE IF EXISTS public.mfa_settings CASCADE;
DROP TABLE IF EXISTS public.ml_training_data CASCADE;
DROP TABLE IF EXISTS public.notification_batch_logs CASCADE;
DROP TABLE IF EXISTS public.notification_consent CASCADE;
DROP TABLE IF EXISTS public.notification_history CASCADE;
DROP TABLE IF EXISTS public.notification_logs CASCADE;
DROP TABLE IF EXISTS public.notification_performance_metrics CASCADE;
DROP TABLE IF EXISTS public.notification_queue CASCADE;
DROP TABLE IF EXISTS public.notification_system_health CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.package_usage CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;
DROP TABLE IF EXISTS public.pain_map_points CASCADE;
DROP TABLE IF EXISTS public.partner_commissions CASCADE;
DROP TABLE IF EXISTS public.partner_sessions CASCADE;
DROP TABLE IF EXISTS public.partner_withdrawals CASCADE;
DROP TABLE IF EXISTS public.pathologies CASCADE;
DROP TABLE IF EXISTS public.patient_assessments CASCADE;
DROP TABLE IF EXISTS public.patient_consents CASCADE;
DROP TABLE IF EXISTS public.patient_documents CASCADE;
DROP TABLE IF EXISTS public.patient_evaluation_responses CASCADE;
DROP TABLE IF EXISTS public.patient_exam_files CASCADE;
DROP TABLE IF EXISTS public.patient_exams CASCADE;
DROP TABLE IF EXISTS public.patient_insights CASCADE;
DROP TABLE IF EXISTS public.patient_lifecycle_events CASCADE;
DROP TABLE IF EXISTS public.patient_outcome_measures CASCADE;
DROP TABLE IF EXISTS public.patient_outcome_predictions CASCADE;
DROP TABLE IF EXISTS public.patient_packages CASCADE;
DROP TABLE IF EXISTS public.patient_pain_records CASCADE;
DROP TABLE IF EXISTS public.patient_pathologies CASCADE;
DROP TABLE IF EXISTS public.patient_predictions CASCADE;
DROP TABLE IF EXISTS public.patient_progress CASCADE;
DROP TABLE IF EXISTS public.patient_risk_scores CASCADE;
DROP TABLE IF EXISTS public.patient_scheduling_preferences CASCADE;
DROP TABLE IF EXISTS public.patient_self_assessments CASCADE;
DROP TABLE IF EXISTS public.patient_sessions CASCADE;
DROP TABLE IF EXISTS public.patient_surgeries CASCADE;
DROP TABLE IF EXISTS public.patient_trends CASCADE;
DROP TABLE IF EXISTS public.prestadores CASCADE;
DROP TABLE IF EXISTS public.professional_chats CASCADE;
DROP TABLE IF EXISTS public.progress_reports CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.push_notifications_log CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.recibos CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.report_executions CASCADE;
DROP TABLE IF EXISTS public.report_exports CASCADE;
DROP TABLE IF EXISTS public.retencao_cancelamentos CASCADE;
DROP TABLE IF EXISTS public.revenue_forecasts CASCADE;
DROP TABLE IF EXISTS public.reward_redemptions CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.satisfaction_surveys CASCADE;
DROP TABLE IF EXISTS public.schedule_blocked_times CASCADE;
DROP TABLE IF EXISTS public.schedule_blocks CASCADE;
DROP TABLE IF EXISTS public.schedule_business_hours CASCADE;
DROP TABLE IF EXISTS public.schedule_cancellation_rules CASCADE;
DROP TABLE IF EXISTS public.schedule_capacity_config CASCADE;
DROP TABLE IF EXISTS public.schedule_notification_settings CASCADE;
DROP TABLE IF EXISTS public.schedule_settings CASCADE;
DROP TABLE IF EXISTS public.security_audit_events CASCADE;
DROP TABLE IF EXISTS public.security_audit_log_extended CASCADE;
DROP TABLE IF EXISTS public.servicos CASCADE;
DROP TABLE IF EXISTS public.session_metrics CASCADE;
DROP TABLE IF EXISTS public.session_templates CASCADE;
DROP TABLE IF EXISTS public.shop_items CASCADE;
DROP TABLE IF EXISTS public.smart_alert_configurations CASCADE;
DROP TABLE IF EXISTS public.smart_alert_history CASCADE;
DROP TABLE IF EXISTS public.staff_performance_metrics CASCADE;
DROP TABLE IF EXISTS public.standardized_test_results CASCADE;
DROP TABLE IF EXISTS public.stripe_purchases CASCADE;
DROP TABLE IF EXISTS public.surgeries CASCADE;
DROP TABLE IF EXISTS public.tarefas CASCADE;
DROP TABLE IF EXISTS public.telemedicine_rooms CASCADE;
DROP TABLE IF EXISTS public.transacoes CASCADE;
DROP TABLE IF EXISTS public.treatment_goals CASCADE;
DROP TABLE IF EXISTS public.treatment_sessions CASCADE;
DROP TABLE IF EXISTS public.user_inventory CASCADE;
DROP TABLE IF EXISTS public.user_invitations CASCADE;
DROP TABLE IF EXISTS public.user_vouchers CASCADE;
DROP TABLE IF EXISTS public.voucher_purchases CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;
DROP TABLE IF EXISTS public.vouchers_purchases CASCADE;
DROP TABLE IF EXISTS public.waiting_list CASCADE;
DROP TABLE IF EXISTS public.waitlist CASCADE;
DROP TABLE IF EXISTS public.waitlist_offers CASCADE;
DROP TABLE IF EXISTS public.wearable_data CASCADE;
DROP TABLE IF EXISTS public.weekly_challenges CASCADE;
DROP TABLE IF EXISTS public.xp_transactions CASCADE;

-- ----------------------------------------------------------------------------
-- PHASE 2: INDEXES FOR SINGLE CLINIC (no organization_id)
-- ----------------------------------------------------------------------------

-- Patients - search indexes (most common queries)
CREATE INDEX IF NOT EXISTS idx_patients_status_created
ON public.patients(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patients_name_status
ON public.patients(lower(full_name), status)
WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_cpf_active
ON public.patients(cpf)
WHERE cpf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_phone_active
ON public.patients(phone)
WHERE phone IS NOT NULL;

-- Appointments - therapist schedule (most common query)
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date_status
ON public.appointments(therapist_id, date, status)
WHERE therapist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_patient_date_status
ON public.appointments(patient_id, date, status);

CREATE INDEX IF NOT EXISTS idx_appointments_date_status_time
ON public.appointments(date, status, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_status_date
ON public.appointments(status, date DESC)
WHERE status IN ('scheduled', 'confirmed', 'in_progress');

-- Sessions - patient history
CREATE INDEX IF NOT EXISTS idx_sessions_patient_status_created
ON public.sessions(patient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_therapist_created
ON public.sessions(therapist_id, created_at DESC)
WHERE therapist_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- PHASE 3: COVERING INDEXES FOR CRITICAL QUERIES
-- ----------------------------------------------------------------------------

-- Appointments + Patients join optimization
CREATE INDEX IF NOT EXISTS idx_appointments_covering_list
ON public.appointments(date, start_time)
INCLUDE (id, patient_id, therapist_id, status, type, room);

-- Profiles - active therapists list
CREATE INDEX IF NOT EXISTS idx_profiles_active_therapists
ON public.profiles(role)
WHERE role IN ('fisioterapeuta', 'estagiario') AND is_active = true;

-- Patients - mobile list view
CREATE INDEX IF NOT EXISTS idx_patients_mobile_list
ON public.patients(created_at DESC)
INCLUDE (id, full_name, phone, email, status);

-- ----------------------------------------------------------------------------
-- PHASE 4: FULL-TEXT SEARCH INDEXES (GIN)
-- ----------------------------------------------------------------------------

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Patients - name search (autocomplete, fuzzy match)
CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm
ON public.patients USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_email_trgm
ON public.patients USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_phone_trgm
ON public.patients USING gin (phone gin_trgm_ops);

-- Profiles - therapist search
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
ON public.profiles USING gin (full_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- PHASE 5: DATA TYPE OPTIMIZATION
-- ----------------------------------------------------------------------------

-- Profiles table - optimize TEXT columns
ALTER TABLE public.profiles
    ALTER COLUMN full_name TYPE varchar(100),
    ALTER COLUMN cpf TYPE varchar(11),
    ALTER COLUMN phone TYPE varchar(20),
    ALTER COLUMN email TYPE varchar(255),
    ALTER COLUMN slug TYPE varchar(100),
    ALTER COLUMN timezone TYPE varchar(50),
    ALTER COLUMN partner_pix_key TYPE varchar(100);

-- Patients table - optimize TEXT columns
ALTER TABLE public.patients
    ALTER COLUMN full_name TYPE varchar(100),
    ALTER COLUMN cpf TYPE varchar(11),
    ALTER COLUMN rg TYPE varchar(20),
    ALTER COLUMN phone TYPE varchar(20),
    ALTER COLUMN email TYPE varchar(255),
    ALTER COLUMN city TYPE varchar(100),
    ALTER COLUMN state TYPE varchar(50),
    ALTER COLUMN zip_code TYPE varchar(20),
    ALTER COLUMN health_insurance TYPE varchar(100),
    ALTER COLUMN insurance_number TYPE varchar(50),
    ALTER COLUMN insurance_plan TYPE varchar(100),
    ALTER COLUMN blood_type TYPE varchar(5),
    ALTER COLUMN occupation TYPE varchar(100),
    ALTER COLUMN profession TYPE varchar(100),
    ALTER COLUMN education_level TYPE varchar(50),
    ALTER COLUMN marital_status TYPE varchar(50);

-- Appointments table - optimize TEXT columns
ALTER TABLE public.appointments
    ALTER COLUMN type TYPE varchar(50),
    ALTER COLUMN status TYPE varchar(30),
    ALTER COLUMN confirmation_status TYPE varchar(30),
    ALTER COLUMN payment_status TYPE varchar(30),
    ALTER COLUMN room TYPE varchar(50),
    ALTER COLUMN cancellation_reason TYPE varchar(255),
    ALTER COLUMN session_type TYPE varchar(50);

-- Sessions table - optimize TEXT columns
ALTER TABLE public.sessions
    ALTER COLUMN status TYPE varchar(30);

-- ----------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- ----------------------------------------------------------------------------

-- To verify tables were dropped:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- To verify indexes were created:
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%idx_%' ORDER BY tablename, indexname;

-- To check storage savings:
-- SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;

-- To verify data type changes:
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('profiles', 'patients', 'appointments', 'sessions') ORDER BY table_name, ordinal_position;
