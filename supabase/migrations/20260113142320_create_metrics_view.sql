-- Migration: Create Daily Metrics Materialized View
-- Description: Creates materialized view for daily appointment metrics

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

-- Add comments
COMMENT ON MATERIALIZED VIEW mv_daily_appointment_metrics IS 'Pre-aggregated daily appointment metrics for dashboard performance';
COMMENT ON FUNCTION refresh_daily_metrics() IS 'Refreshes the daily metrics materialized view';
