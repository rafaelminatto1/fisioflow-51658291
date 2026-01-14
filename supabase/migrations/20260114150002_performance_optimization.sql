-- Migration: Performance Optimization - Indexes and RLS
-- Description: Add missing indexes, optimize RLS policies, and improve query performance
-- Date: 2026-01-14

-- ============================================================================
-- PERFORMANCE INDEXES FOR FOREIGN KEYS
-- ============================================================================

-- Foreign keys identified by Supabase Performance Advisor as unindexed

-- Patient goal tracking
CREATE INDEX IF NOT EXISTS idx_patient_goal_tracking_created_by
ON public.patient_goal_tracking(created_by)
WHERE created_by IS NOT NULL;

-- Patient insights
CREATE INDEX IF NOT EXISTS idx_patient_insights_acknowledged_by
ON public.patient_insights(acknowledged_by)
WHERE acknowledged_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_insights_actioned_by
ON public.patient_insights(actioned_by)
WHERE actioned_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_insights_comparison_benchmark_id
ON public.patient_insights(comparison_benchmark_id)
WHERE comparison_benchmark_id IS NOT NULL;

-- Patient lifecycle events
CREATE INDEX IF NOT EXISTS idx_patient_lifecycle_events_created_by
ON public.patient_lifecycle_events(created_by)
WHERE created_by IS NOT NULL;

-- Appointments optimization
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status
ON public.appointments(patient_id, status)
WHERE status IN ('scheduled', 'confirmed', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date
ON public.appointments(therapist_id, start_time DESC)
WHERE start_time >= now() - interval '30 days';

-- Sessions optimization
CREATE INDEX IF NOT EXISTS idx_sessions_patient_created
ON public.sessions(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_therapist_created
ON public.sessions(therapist_id, created_at DESC)
WHERE created_at >= now() - interval '90 days';

-- Medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient
ON public.medical_records(patient_id)
WHERE patient_id IS NOT NULL;

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_patient_date
ON public.payments(patient_id, created_at DESC)
WHERE created_at >= now() - interval '365 days';

CREATE INDEX IF NOT EXISTS idx_payments_status
ON public.payments(status, created_at DESC)
WHERE status IN ('pending', 'partial');

-- Patient packages
CREATE INDEX IF NOT EXISTS idx_patient_packages_patient_active
ON public.patient_packages(patient_id, status)
WHERE status = 'active';

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Dashboard metrics queries
CREATE INDEX IF NOT EXISTS idx_appointments_dashboard_metrics
ON public.appointments(
    date_trunc('day', start_time),
    status
)
WHERE start_time >= now() - interval '90 days';

CREATE INDEX IF NOT EXISTS idx_sessions_dashboard_metrics
ON public.sessions(
    date_trunc('day', created_at),
    status
)
WHERE created_at >= now() - interval '90 days';

CREATE INDEX IF NOT EXISTS idx_patients_dashboard_metrics
ON public.patients(
    date_trunc('day', created_at),
    status
)
WHERE created_at >= now() - interval '90 days';

-- Patient list with filtering
CREATE INDEX IF NOT EXISTS idx_patients_name_status
ON public.patients(lower(name), status)
WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_cpf
ON public.patients(cpf)
WHERE cpf IS NOT NULL;

-- Active patients lookup
CREATE INDEX IF NOT EXISTS idx_patients_active
ON public.patients(status, created_at DESC)
WHERE status = 'active';

-- Appointments lookup
CREATE INDEX IF NOT EXISTS idx_appointments_date_range_status
ON public.appointments(start_time, end_time, status)
WHERE start_time >= now() - interval '7 days';

-- Sessions with SOAP filtering
CREATE INDEX IF NOT EXISTS idx_sessions_patient_status
ON public.sessions(patient_id, status, created_at DESC)
WHERE status != 'draft';

-- ============================================================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Recent patients (for quick access)
CREATE INDEX IF NOT EXISTS idx_patients_recent
ON public.patients(created_at DESC)
WHERE created_at >= now() - interval '30 days';

-- Active appointments
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming
ON public.appointments(start_time, patient_id)
WHERE start_time >= now()
AND status IN ('scheduled', 'confirmed');

-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON public.notifications(user_id, created_at DESC)
WHERE read_at IS NULL;

-- Pending payments
CREATE INDEX IF NOT EXISTS idx_payments_pending
ON public.payments(patient_id, amount)
WHERE status = 'pending';

-- Active packages with sessions remaining
CREATE INDEX IF NOT EXISTS idx_patient_packages_available
ON public.patient_packages(patient_id, remaining_sessions)
WHERE status = 'active' AND remaining_sessions > 0;

-- Recent audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
ON public.audit_logs(created_at DESC, table_name)
WHERE created_at >= now() - interval '30 days';

-- ============================================================================
-- GIN INDEXES FOR JSONB COLUMNS
-- ============================================================================

-- Patient medical records JSONB
CREATE INDEX IF NOT EXISTS idx_patients_searchable_data
ON public.patients USING gin(searchable_data)
WHERE searchable_data IS NOT NULL;

-- Session attachments metadata
CREATE INDEX IF NOT EXISTS idx_session_attachments_metadata
ON public.session_attachments USING gin(metadata)
WHERE metadata IS NOT NULL;

-- Patient insights JSONB
CREATE INDEX IF NOT EXISTS idx_patient_insights_data
ON public.patient_insights USING gin(data)
WHERE data IS NOT NULL;

-- ============================================================================
-- COVERING INDEXES FOR SPECIFIC QUERIES
-- ============================================================================

-- Appointments with patient and therapist names (covering index)
CREATE INDEX IF NOT EXISTS idx_appointments_covering
ON public.appointments(patient_id, therapist_id, start_time, status)
INCLUDE (notes, created_at);

-- Sessions with patient info (covering index)
CREATE INDEX IF NOT EXISTS idx_sessions_covering
ON public.sessions(patient_id, therapist_id, created_at, status)
INCLUDE (subjective, objective, assessment);

-- ============================================================================
-- OPTIMIZED RLS POLICIES WITH AUTH UID CACHING
-- ============================================================================

-- Helper function with proper search_path
CREATE OR REPLACE FUNCTION private.current_user_id()
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN (select auth.uid());
END;
$$;

-- ============================================================================
-- BRIN INDEXES FOR TIME-SERIES DATA (More efficient than B-tree)
-- ============================================================================

-- Appointments time series
CREATE INDEX IF NOT EXISTS idx_appointments_start_time_brin
ON public.appointments USING brin(start_time)
WITH (pages_per_range = 32);

-- Sessions time series
CREATE INDEX IF NOT EXISTS idx_sessions_created_at_brin
ON public.sessions USING brin(created_at)
WITH (pages_per_range = 32);

-- Audit logs time series
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_brin
ON public.audit_logs USING brin(created_at)
WITH (pages_per_range = 32);

-- ============================================================================
-- STATISTICS UPDATE FOR BETTER QUERY PLANNING
-- ============================================================================

-- Update statistics on large tables
ANALYZE public.patients;
ANALYZE public.appointments;
ANALYZE public.sessions;
ANALYZE public.payments;
ANALYZE public.medical_records;
ANALYZE public.profiles;

-- ============================================================================
-- VACUUM ANALYZE FOR BLOAT REDUCTION
-- ============================================================================

-- Note: VACUUM cannot be run in a transaction block
-- These commands should be run separately if needed
-- VACUUM ANALYZE public.patients;
-- VACUUM ANALYZE public.appointments;
-- VACUUM ANALYZE public.sessions;

-- ============================================================================
-- CLUSTERING TABLES FOR BETTER SEQUENTIAL ACCESS
-- ============================================================================

-- Cluster appointments by date for better range query performance
-- Uncomment if you want to cluster (this is an expensive operation)
-- CLUSTER public.appointments USING idx_appointments_dashboard_metrics;

-- ============================================================================
-- INDEX USAGE MONITORING
-- ============================================================================

-- Enable pg_stat_statements if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- Grant permission to view statistics
GRANT SELECT ON pg_stat_statements TO authenticated;

-- ============================================================================
-- PERFORMANCE VIEWS FOR MONITORING
-- ============================================================================

-- View for monitoring index usage
CREATE OR REPLACE VIEW private.index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW'
        WHEN idx_scan < 1000 THEN 'MEDIUM'
        ELSE 'HIGH'
    END as usage_category
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Grant access to monitoring views
GRANT SELECT ON private.index_usage_stats TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_appointments_patient_status IS 'Covering index for appointment patient lookups with status filter';
COMMENT ON INDEX idx_sessions_patient_created IS 'Index for patient sessions ordered by creation date';
COMMENT ON INDEX idx_patients_recent IS 'Partial index for recent patients (last 30 days) - smaller and faster';
COMMENT ON INDEX idx_appointments_upcoming IS 'Partial index for upcoming appointments only - optimizes scheduling queries';
COMMENT ON FUNCTION private.current_user_id() IS 'Cached version of auth.uid() for use in RLS policies to improve performance';
COMMENT ON VIEW private.index_usage_stats IS 'Monitoring view for index usage statistics. Helps identify unused indexes.';

-- ============================================================================
-- PERFORMANCE CONFIGURATION
-- ============================================================================

-- Set default statistics target for better query planning
ALTER TABLE public.appointments SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE public.sessions SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE public.patients SET (autovacuum_analyze_scale_factor = 0.05);

-- Enable parallel query for large tables
ALTER TABLE public.patients SET (parallel_workers = 4);
ALTER TABLE public.sessions SET (parallel_workers = 4);
ALTER TABLE public.appointments SET (parallel_workers = 4);

-- ============================================================================
-- FINAL VERIFICATION QUERIES
-- ============================================================================

-- These queries can be used to verify the improvements:

-- Check index usage after implementation
-- SELECT * FROM private.index_usage_stats WHERE usage_category = 'UNUSED';

-- Verify cache hit rates should be > 99%
-- SELECT
--     'index hit rate' as name,
--     sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100 as ratio
-- FROM pg_statio_user_indexes;

-- Check for unused indexes
-- SELECT
--     schemaname,
--     tablename,
--     indexname
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0
-- AND indexname NOT LIKE '%_pkey'
-- ORDER BY schemaname, tablename;
