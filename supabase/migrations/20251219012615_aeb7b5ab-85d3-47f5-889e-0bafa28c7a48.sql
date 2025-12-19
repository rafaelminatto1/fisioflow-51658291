-- =====================================================
-- ÍNDICES DE PERFORMANCE PARA FISIOFLOW
-- (Removidos índices para colunas inexistentes)
-- =====================================================

-- Extensão para busca por similaridade
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices para appointments (agendamentos)
CREATE INDEX IF NOT EXISTS idx_appointments_org_datetime 
ON public.appointments (organization_id, appointment_date, appointment_time);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
ON public.appointments (patient_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date 
ON public.appointments (therapist_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status_date 
ON public.appointments (status, appointment_date);

-- Índices para patients (pacientes)
CREATE INDEX IF NOT EXISTS idx_patients_name_gin 
ON public.patients USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_email 
ON public.patients (email);

CREATE INDEX IF NOT EXISTS idx_patients_phone 
ON public.patients (phone);

CREATE INDEX IF NOT EXISTS idx_patients_status 
ON public.patients (status);

-- Índices para transações financeiras
CREATE INDEX IF NOT EXISTS idx_contas_financeiras_org_status_date 
ON public.contas_financeiras (organization_id, status, data_vencimento);

CREATE INDEX IF NOT EXISTS idx_contas_financeiras_tipo_date 
ON public.contas_financeiras (tipo, data_vencimento);

CREATE INDEX IF NOT EXISTS idx_contas_financeiras_patient 
ON public.contas_financeiras (patient_id);

-- Índices para profiles (usuários)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles (email);

CREATE INDEX IF NOT EXISTS idx_profiles_org 
ON public.profiles (organization_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON public.profiles (user_id);

-- Índices para exercícios
CREATE INDEX IF NOT EXISTS idx_exercises_category 
ON public.exercises (category);

CREATE INDEX IF NOT EXISTS idx_exercises_name_gin 
ON public.exercises USING gin (name gin_trgm_ops);

-- Índices para eventos
CREATE INDEX IF NOT EXISTS idx_eventos_status_date 
ON public.eventos (status, data_inicio);

CREATE INDEX IF NOT EXISTS idx_eventos_categoria 
ON public.eventos (categoria);

-- Índices para leads (CRM)
CREATE INDEX IF NOT EXISTS idx_leads_estagio_date 
ON public.leads (estagio, created_at);

CREATE INDEX IF NOT EXISTS idx_leads_temperatura 
ON public.leads (temperatura);

CREATE INDEX IF NOT EXISTS idx_leads_score 
ON public.leads (score DESC);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON public.notifications (user_id, is_read, created_at DESC);

-- Índices para audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_date 
ON public.audit_log (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table 
ON public.audit_log (table_name, timestamp DESC);

-- Índices para session_packages
CREATE INDEX IF NOT EXISTS idx_session_packages_patient_status 
ON public.session_packages (patient_id, status);

-- Índices para lista de espera
CREATE INDEX IF NOT EXISTS idx_waitlist_status_priority 
ON public.waitlist (status, priority DESC);

-- Índice composto para relatórios de faturamento
CREATE INDEX IF NOT EXISTS idx_appointments_billing 
ON public.appointments (therapist_id, appointment_date, payment_status, payment_amount);

-- Dashboard de ocupação (apenas agendamentos ativos)
CREATE INDEX IF NOT EXISTS idx_appointments_occupancy 
ON public.appointments (therapist_id, appointment_date, status)
WHERE status IN ('scheduled', 'confirmed', 'completed');