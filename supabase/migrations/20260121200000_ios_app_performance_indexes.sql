-- ============================================================================
-- Migration: iOS App Performance Indexes
-- Created: 2025-01-21
-- Purpose: Otimizar índices para consultas mobile do App iOS (FisioFlow)
--
-- Problemas identificados:
-- - profiles: 511K seq_scan vs 163K idx_scan (76% sem índice)
-- - patients: 308K seq_scan vs 113K idx_scan (73% sem índice)
-- - appointments: 147K seq_scan vs 273K idx_scan (35% sem índice)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles - Lista de profissionais ativos por organização
-- ----------------------------------------------------------------------------
-- Justificativa: Queries mobile filtram por organization_id + role + is_active
-- Query exemplo: SELECT * FROM profiles WHERE organization_id = ? AND role = 'fisioterapeuta' AND is_active = true
CREATE INDEX IF NOT EXISTS idx_profiles_org_role_active
ON public.profiles(organization_id, role, is_active)
WHERE is_active = true;

COMMENT ON INDEX idx_profiles_org_role_active IS
'Índice parcial para listagem de profissionais ativos por organização e tipo - usado no App iOS';

-- ----------------------------------------------------------------------------
-- 2. patients - Lista principal do mobile (org + status + recentes)
-- ----------------------------------------------------------------------------
-- Justificativa: View principal de pacientes filtra por org, status e ordena por created_at DESC
-- Query exemplo: SELECT * FROM patients WHERE organization_id = ? AND status = 'active' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_patients_org_status_created
ON public.patients(organization_id, status, created_at DESC);

COMMENT ON INDEX idx_patients_org_status_created IS
'Índice composto para listagem principal de pacientes no App iOS - org + status + mais recentes';

-- ----------------------------------------------------------------------------
-- 3. appointments - Agenda do paciente otimizada
-- ----------------------------------------------------------------------------
-- Justificativa: Pacientes visualizam seus agendamentos frequentemente
-- Query exemplo: SELECT * FROM appointments WHERE organization_id = ? AND patient_id = ? ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_appointments_org_patient_date
ON public.appointments(organization_id, patient_id, date DESC);

COMMENT ON INDEX idx_appointments_org_patient_date IS
'Índice para agenda do paciente no App iOS - mostra agendamentos ordenados por data';

-- ----------------------------------------------------------------------------
-- 4. patient_sessions - Pacotes de sessões ativas
-- ----------------------------------------------------------------------------
-- ATENÇÃO: patient_sessions NÃO possui coluna organization_id
-- Criando índice sem esta coluna (considerar adicionar organization_id em futura migration)
CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient_remaining
ON public.patient_sessions(patient_id, remaining_sessions)
WHERE remaining_sessions > 0;

COMMENT ON INDEX idx_patient_sessions_patient_remaining IS
'Índice parcial para pacotes de sessões com sessões disponíveis - App iOS';

-- ============================================================================
-- Verificação de índices criados
-- ============================================================================
-- Para verificar se os índices foram criados corretamente:
--
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--     AND indexname IN (
--         'idx_profiles_org_role_active',
--         'idx_patients_org_status_created',
--         'idx_appointments_org_patient_date',
--         'idx_patient_sessions_patient_remaining'
--     )
-- ORDER BY tablename;
--
-- Para verificar o uso dos índices após alguns dias:
--
-- SELECT
--     relname::text as table_name,
--     indexrelname::text as index_name,
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexrelname IN (
--         'idx_profiles_org_role_active',
--         'idx_patients_org_status_created',
--         'idx_appointments_org_patient_date',
--         'idx_patient_sessions_patient_remaining'
--     )
-- ORDER BY idx_scan DESC;
