-- Migration: Performance Optimization for Supabase
-- Description: Adds missing indexes, optimizes queries
-- Note: pg_stat_statements must be enabled via Supabase Dashboard > Database > Extensions

-- ============================================================================
-- 1. ORGANIZATION_ID INDEXES (CRITICAL - most queries filter by org)
-- ============================================================================

-- appointments table - add organization_id indexes
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id
    ON appointments(organization_id);

CREATE INDEX IF NOT EXISTS idx_appointments_org_date
    ON appointments(organization_id, date)
    WHERE date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_org_status
    ON appointments(organization_id, status)
    WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_org_date_status
    ON appointments(organization_id, date, status)
    WHERE date IS NOT NULL AND status IS NOT NULL;

-- patients table - add organization_id indexes
CREATE INDEX IF NOT EXISTS idx_patients_organization_id
    ON patients(organization_id);

-- profiles table - add organization_id indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
    ON profiles(organization_id);

-- ============================================================================
-- 2. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- For dashboard queries: upcoming appointments by therapist
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date_status
    ON appointments(therapist_id, date, status)
    WHERE therapist_id IS NOT NULL AND date IS NOT NULL;

-- For patient history queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date_status
    ON appointments(patient_id, date DESC, status)
    WHERE patient_id IS NOT NULL AND date IS NOT NULL;

-- Note: Can't use CURRENT_DATE in partial index (not IMMUTABLE)
-- For today's appointments, use the date_range index instead
-- CREATE INDEX IF NOT EXISTS idx_appointments_today
--     ON appointments(date, status, start_time)
--     WHERE date >= CURRENT_DATE;

-- For appointment searches with date range
CREATE INDEX IF NOT EXISTS idx_appointments_date_range
    ON appointments(date DESC, start_time);

-- ============================================================================
-- 3. OPTIMIZE REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Create a dedicated index for Realtime filters
CREATE INDEX IF NOT EXISTS idx_appointments_realtime_filter
    ON appointments(organization_id, updated_at DESC)
    WHERE organization_id IS NOT NULL;

-- ============================================================================
-- 4. MEDICAL RECORDS PERFORMANCE INDEXES
-- ============================================================================

-- Patient evolutions are queried frequently (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'medical_records' AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_medical_records_patient_date
            ON medical_records(patient_id, created_at DESC)
            WHERE patient_id IS NOT NULL;
    END IF;
END $$;

-- SOAP records by appointment (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'soap_records' AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_soap_records_appointment
            ON soap_records(appointment_id)
            WHERE appointment_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 5. FINANCIAL/TRANSACTIONS PERFORMANCE
-- ============================================================================

-- Payment status queries (only if status column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_payments_status_date
            ON payments(status, created_at DESC)
            WHERE status IS NOT NULL;
    END IF;
END $$;

-- Transaction queries with organization filtering (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'transactions' AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_transactions_org_date
            ON transactions(organization_id, created_at DESC)
            WHERE organization_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 6. EXERCISE PROTOCOLS PERFORMANCE
-- ============================================================================

-- Active protocols query (only if table and columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'exercise_protocols' AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exercise_protocols' AND column_name = 'is_active'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_exercise_protocols_org_active
            ON exercise_protocols(organization_id, is_active, name)
            WHERE organization_id IS NOT NULL;
    END IF;
END $$;

-- Patient exercise plans (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'exercise_plans' AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exercise_plans' AND column_name = 'patient_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_exercise_plans_patient_date
            ON exercise_plans(patient_id, created_at DESC)
            WHERE patient_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 7. PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ============================================================================

-- Note: Can't use CURRENT_DATE in partial index (not IMMUTABLE)
-- Use idx_appointments_org_date_status for filtering active appointments
-- CREATE INDEX IF NOT EXISTS idx_appointments_active
--     ON appointments(organization_id, date, start_time)
--     WHERE status NOT IN ('cancelled', 'rescheduled') AND date >= CURRENT_DATE;

-- Note: Can't use CURRENT_DATE in partial index (not IMMUTABLE)
-- CREATE INDEX IF NOT EXISTS idx_appointments_pending
--     ON appointments(organization_id, date, start_time, patient_id)
--     WHERE status IN ('scheduled', 'agendado', 'pending') AND date >= CURRENT_DATE;

-- ============================================================================
-- 8. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to update table statistics (should run periodically)
CREATE OR REPLACE FUNCTION analyze_performance_tables()
RETURNS void AS $$
BEGIN
    -- Analyze frequently accessed tables
    ANALYZE appointments;
    ANALYZE patients;
    ANALYZE profiles;
    ANALYZE medical_records;
    ANALYZE soap_records;
    ANALYZE payments;
    ANALYZE transactions;
    ANALYZE exercise_protocols;
    ANALYZE exercise_plans;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION analyze_performance_tables() TO authenticated;

-- ============================================================================
-- 9. MATERIALIZED VIEW FOR DAILY METRICS
-- ============================================================================

-- Drop existing if recreating
DROP MATERIALIZED VIEW IF EXISTS mv_daily_appointment_metrics CASCADE;

-- Create materialized view for daily metrics (refreshed periodically)
CREATE MATERIALIZED VIEW mv_daily_appointment_metrics AS
SELECT
    COALESCE(date, appointment_date) as date,
    organization_id,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    COUNT(*) FILTER (WHERE status = 'scheduled' OR status = 'agendado') as scheduled_count,
    COUNT(DISTINCT patient_id) as unique_patients
FROM appointments
WHERE COALESCE(date, appointment_date) IS NOT NULL
GROUP BY COALESCE(date, appointment_date), organization_id;

-- Create index on the materialized view
CREATE UNIQUE INDEX idx_mv_daily_metrics_date_org
    ON mv_daily_appointment_metrics(organization_id, date);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_appointment_metrics;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON mv_daily_appointment_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_daily_metrics() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW mv_daily_appointment_metrics IS 'Pre-aggregated daily appointment metrics for dashboard performance';
COMMENT ON FUNCTION refresh_daily_metrics() IS 'Refreshes the daily metrics materialized view';
COMMENT ON FUNCTION analyze_performance_tables() IS 'Updates table statistics for query optimization';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
