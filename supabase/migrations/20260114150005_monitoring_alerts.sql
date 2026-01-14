-- Migration: Monitoring and Alerts System
-- Description: Configure monitoring views, alert triggers, and performance metrics
-- Date: 2026-01-14

-- Create private schema if not exists
CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================================
-- MONITORING VIEWS FOR SECURITY
-- ============================================================================

-- Security events summary view
CREATE OR REPLACE VIEW private.security_events_summary AS
SELECT
    date_trunc('hour', created_at) as hour,
    event_category,
    user_role,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE NOT success) as failed_events,
    COUNT(*) FILTER (WHERE success = false AND event_category = 'security') as security_failures,
    jsonb_agg(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL) as affected_users
FROM public.audit_log_enhanced
WHERE created_at >= now() - interval '24 hours'
GROUP BY date_trunc('hour', created_at), event_category, user_role
ORDER BY hour DESC;

GRANT SELECT ON private.security_events_summary TO authenticated;

-- Failed authentication attempts view
CREATE OR REPLACE VIEW private.failed_auth_attempts AS
SELECT
    user_id,
    user_email,
    user_role,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '5 minutes') as recent_failures,
    CASE
        WHEN COUNT(*) FILTER (WHERE created_at >= now() - interval '5 minutes') >= 5 THEN 'suspicious'
        WHEN COUNT(*) FILTER (WHERE created_at >= now() - interval '15 minutes') >= 10 THEN 'warning'
        ELSE 'normal'
    END as risk_level
FROM public.audit_log_enhanced
WHERE event_category = 'security'
AND success = false
AND created_at >= now() - interval '1 hour'
GROUP BY user_id, user_email, user_role
ORDER BY recent_failures DESC;

GRANT SELECT ON private.failed_auth_attempts TO authenticated;

-- ============================================================================
-- MONITORING VIEWS FOR PERFORMANCE
-- ============================================================================

-- Slow queries view (requires pg_stat_statements)
CREATE OR REPLACE VIEW private.slow_queries AS
SELECT
    query,
    calls,
    mean_exec_time as avg_time_ms,
    max_exec_time as max_time_ms,
    total_exec_time as total_time_ms,
    stddev_exec_time as stddev_time_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Queries taking more than 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 50;

GRANT SELECT ON private.slow_queries TO authenticated;

-- Cache performance view
CREATE OR REPLACE VIEW private.cache_performance_metrics AS
SELECT
    'index_hit_rate' as metric_name,
    round(
        (sum(idx_blks_hit)::numeric / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100),
        2
    ) as metric_value
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'table_hit_rate' as metric_name,
    round(
        (sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit + heap_blks_read), 0) * 100),
        2
    ) as metric_value
FROM pg_statio_user_tables;

GRANT SELECT ON private.cache_performance_metrics TO authenticated;

-- Database size metrics
CREATE OR REPLACE VIEW private.database_size_metrics AS
SELECT
    datname as database_name,
    pg_size_pretty(pg_database_size(datname)) as total_size,
    pg_database_size(datname) as size_bytes
FROM pg_database
WHERE datistemplate = false
ORDER BY pg_database_size(datname) DESC;

GRANT SELECT ON private.database_size_metrics TO authenticated;

-- Table size metrics (top 20 largest tables)
CREATE OR REPLACE VIEW private.largest_tables AS
SELECT
    schemaname || '.' || tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

GRANT SELECT ON private.largest_tables TO authenticated;

-- ============================================================================
-- ALERT THRESHOLDS CONFIGURATION
-- ============================================================================

-- Table to store alert configurations
CREATE TABLE IF NOT EXISTS private.monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name TEXT NOT NULL UNIQUE,
    alert_type TEXT NOT NULL, -- 'security', 'performance', 'storage', 'auth'
    metric_name TEXT NOT NULL,
    threshold_value NUMERIC NOT NULL,
    comparison_operator TEXT NOT NULL, -- '>', '<', '=', '>=', '<='
    severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
    enabled BOOLEAN DEFAULT true,
    notification_channels TEXT[], -- ['email', 'slack', 'webhook']
    last_triggered_at TIMESTAMPTZ,
    trigger_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default alert configurations
INSERT INTO private.monitoring_alerts (alert_name, alert_type, metric_name, threshold_value, comparison_operator, severity, notification_channels) VALUES
-- Security alerts
('high_failed_auth_rate', 'security', 'failed_auth_rate_5min', 10, '>=', 'critical', ARRAY['email']),
('multiple_failed_logins_same_user', 'security', 'failed_auth_same_user_5min', 5, '>=', 'warning', ARRAY['email']),

-- Performance alerts
('slow_query_avg_time', 'performance', 'avg_query_time_ms', 500, '>=', 'warning', ARRAY['email']),
('cache_hit_rate_low', 'performance', 'cache_hit_rate', 95, '<', 'warning', ARRAY['email']),
('index_hit_rate_low', 'performance', 'index_hit_rate', 98, '<', 'warning', ARRAY['email']),

-- Storage alerts
('database_size_warning', 'storage', 'database_size_gb', 80, '>=', 'warning', ARRAY['email']),
('table_bloat_high', 'storage', 'table_bloat_percent', 30, '>=', 'warning', ARRAY['email']),

-- Auth alerts
('mfa_admin_disabled', 'auth', 'admin_without_mfa', 1, '>=', 'critical', ARRAY['email']),
('suspicious_activity', 'security', 'suspicious_events_5min', 10, '>=', 'critical', ARRAY['email', 'slack'])
ON CONFLICT (alert_name) DO NOTHING;

-- RLS for monitoring alerts
ALTER TABLE private.monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_alerts_select_admin" ON private.monitoring_alerts
FOR SELECT TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role = 'admin'
        AND revoked_at IS NULL
    )
);

GRANT SELECT ON private.monitoring_alerts TO authenticated;

-- ============================================================================
-- ALERT HISTORY TABLE
-- ============================================================================

-- Table to store triggered alerts
CREATE TABLE IF NOT EXISTS private.monitoring_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES private.monitoring_alerts(id) ON DELETE SET NULL,
    alert_name TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    metric_value NUMERIC,
    threshold_value NUMERIC,
    message TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for alert history queries
CREATE INDEX IF NOT EXISTS idx_monitoring_alert_history_alert_id
ON private.monitoring_alert_history(alert_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_alert_history_type
ON private.monitoring_alert_history(alert_type, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_alert_history_resolved
ON private.monitoring_alert_history(resolved, created_at DESC)
WHERE resolved = false;

-- RLS for alert history
ALTER TABLE private.monitoring_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_alert_history_select_admin" ON private.monitoring_alert_history
FOR SELECT TO authenticated
USING (
    (select auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role = 'admin'
        AND revoked_at IS NULL
    )
);

GRANT SELECT ON private.monitoring_alert_history TO authenticated;

-- ============================================================================
-- ALERT CHECKING FUNCTIONS
-- ============================================================================

-- Function to check if alert should be triggered
CREATE OR REPLACE FUNCTION private.check_monitoring_alerts()
RETURNS TABLE (
    alert_id UUID,
    alert_name TEXT,
    should_trigger BOOLEAN,
    current_value NUMERIC,
    threshold_value NUMERIC,
    message TEXT
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ma.id as alert_id,
        ma.alert_name,
        CASE ma.metric_name
            -- Security: Failed auth rate in last 5 minutes
            WHEN 'failed_auth_rate_5min' THEN
                (SELECT COUNT(*)::numeric FROM public.audit_log_enhanced
                 WHERE event_category = 'security'
                 AND success = false
                 AND created_at >= now() - interval '5 minutes') >= ma.threshold_value

            -- Security: Failed auth for same user
            WHEN 'failed_auth_same_user_5min' THEN
                EXISTS(SELECT 1 FROM private.failed_auth_attempts WHERE recent_failures >= ma.threshold_value::int)

            -- Performance: Average query time
            WHEN 'avg_query_time_ms' THEN
                (SELECT AVG(mean_exec_time)::numeric FROM pg_stat_statements) >= ma.threshold_value

            -- Performance: Cache hit rate
            WHEN 'cache_hit_rate' THEN
                (SELECT round((sum(idx_blks_hit)::numeric / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100, 2)
                 FROM pg_statio_user_indexes) < ma.threshold_value

            -- Performance: Index hit rate
            WHEN 'index_hit_rate' THEN
                (SELECT round((sum(idx_blks_hit)::numeric / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100, 2)
                 FROM pg_statio_user_indexes) < ma.threshold_value

            -- Storage: Database size
            WHEN 'database_size_gb' THEN
                (SELECT pg_database_size(current_database()) / (1024^3)::numeric) >= ma.threshold_value

            -- Auth: Admin without MFA
            WHEN 'admin_without_mfa' THEN
                (SELECT COUNT(*) FROM private.get_admins_without_mfa()) >= ma.threshold_value

            ELSE false
        END as should_trigger,
        -- Current values (placeholder for actual metrics)
        0 as current_value,
        ma.threshold_value,
        'Alert condition met: ' || ma.metric_name || ' ' || ma.comparison_operator || ' ' || ma.threshold_value as message
    FROM private.monitoring_alerts ma
    WHERE ma.enabled = true;
END;
$$;

-- Function to log triggered alert
CREATE OR REPLACE FUNCTION private.log_monitoring_alert(
    p_alert_id UUID,
    p_alert_name TEXT,
    p_metric_value NUMERIC,
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alert RECORD;
    log_id UUID;
BEGIN
    -- Get alert details
    SELECT * INTO v_alert
    FROM private.monitoring_alerts
    WHERE id = p_alert_id;

    -- Insert alert history
    INSERT INTO private.monitoring_alert_history (
        alert_id,
        alert_name,
        alert_type,
        severity,
        metric_value,
        threshold_value,
        message,
        metadata
    ) VALUES (
        p_alert_id,
        p_alert_name,
        v_alert.alert_type,
        v_alert.severity,
        p_metric_value,
        v_alert.threshold_value,
        p_message,
        p_metadata
    ) RETURNING id INTO log_id;

    -- Update alert trigger count and last triggered time
    UPDATE private.monitoring_alerts
    SET
        last_triggered_at = now(),
        trigger_count = trigger_count + 1
    WHERE id = p_alert_id;

    RETURN log_id;
END;
$$;

-- ============================================================================
-- DASHBOARD SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW private.monitoring_dashboard AS
SELECT
    -- Security metrics
    (SELECT COUNT(*) FROM public.audit_log_enhanced WHERE created_at >= now() - interval '24 hours') as total_audit_events_24h,
    (SELECT COUNT(*) FROM public.audit_log_enhanced WHERE created_at >= now() - interval '24 hours' AND NOT success) as failed_events_24h,
    (SELECT COUNT(*) FROM private.failed_auth_attempts WHERE risk_level = 'suspicious') as suspicious_auth_attempts,

    -- Performance metrics
    (SELECT ROUND((sum(idx_blks_hit)::numeric / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100, 2) FROM pg_statio_user_indexes) as cache_hit_rate,
    (SELECT ROUND(AVG(mean_exec_time)::numeric, 2) FROM pg_stat_statements) as avg_query_time_ms,
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0) as unused_indexes_count,

    -- Storage metrics
    (SELECT pg_database_size(current_database()) / (1024^3)::numeric) as database_size_gb,
    (SELECT COUNT(*) FROM private.largest_tables) as large_tables_count,

    -- Auth metrics
    (SELECT COUNT(*) FROM private.mfa_status_dashboard WHERE mfa_status = 'mfa_required') as admins_without_mfa,
    (SELECT COUNT(*) FROM private.mfa_status_dashboard WHERE mfa_status = 'mfa_enabled') as users_with_mfa,

    -- Active alerts
    (SELECT COUNT(*) FROM private.monitoring_alert_history WHERE resolved = false) as active_alerts_count,

    now() as last_updated;

GRANT SELECT ON private.monitoring_dashboard TO authenticated;

-- ============================================================================
-- CRON JOBS FOR ALERT CHECKING
-- ============================================================================

-- Schedule alert checking every 5 minutes
SELECT cron.schedule(
    'check-monitoring-alerts',
    '*/5 * * * *', -- Every 5 minutes
    $$
    SELECT
        private.log_monitoring_alert(
            alert_id,
            alert_name,
            current_value,
            message,
            jsonb_build_object('checked_at', now())
        )
    FROM private.check_monitoring_alerts()
    WHERE should_trigger = true;
    $$
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.check_monitoring_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION private.log_monitoring_alert(uuid, text, numeric, text, jsonb) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE private.monitoring_alerts IS 'Configuration for monitoring alerts and thresholds';
COMMENT ON TABLE private.monitoring_alert_history IS 'History of triggered monitoring alerts';
COMMENT ON FUNCTION private.check_monitoring_alerts() IS 'Check all monitoring conditions and return alerts that should be triggered';
COMMENT ON FUNCTION private.log_monitoring_alert() IS 'Log a triggered monitoring alert to history';
COMMENT ON VIEW private.monitoring_dashboard IS 'Summary dashboard of all monitoring metrics';
COMMENT ON VIEW private.security_events_summary IS 'Hourly summary of security events by category and role';
COMMENT ON VIEW private.failed_auth_attempts IS 'View showing failed authentication attempts with risk assessment';
COMMENT ON VIEW private.cache_performance_metrics IS 'Database cache hit rates for indexes and tables';
COMMENT ON VIEW private.largest_tables IS 'Top 20 largest tables by total size including indexes';
