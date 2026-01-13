-- ============================================================================
-- Supabase Performance Indexes and Functions
-- ============================================================================
-- Adds critical indexes and performance monitoring functions
-- ============================================================================

-- Drop and recreate get_slow_queries with correct signature
DROP FUNCTION IF EXISTS public.get_slow_queries(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_slow_queries(min_calls INTEGER DEFAULT 5, min_ms INTEGER DEFAULT 100)
RETURNS TABLE (
  query_id BIGINT,
  calls INTEGER,
  total_time DECIMAL,
  mean_time DECIMAL,
  max_time DECIMAL,
  query_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extension_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) INTO extension_exists;

  IF NOT extension_exists THEN
    RAISE NOTICE 'pg_stat_statements extension is not enabled';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sq.queryid,
    sq.calls,
    sq.total_exec_time,
    sq.mean_exec_time,
    sq.max_exec_time,
    LEFT(sq.query, 500) as query_text
  FROM pg_stat_statements sq
  WHERE sq.calls >= min_calls
    AND sq.mean_exec_time >= min_ms
  ORDER BY sq.mean_exec_time DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_slow_queries(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(INTEGER, INTEGER) TO anon;

-- Recreate analyze_performance_tables with VOID return type
DROP FUNCTION IF EXISTS public.analyze_performance_tables();

CREATE OR REPLACE FUNCTION public.analyze_performance_tables()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('appointments', 'patients', 'profiles', 'exercises', 'exercise_protocols')
  LOOP
    EXECUTE format('ANALYZE public.%I', table_name);
  END LOOP;

  RAISE NOTICE 'Analyzed performance tables';
END;
$$;

GRANT EXECUTE ON FUNCTION public.analyze_performance_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_performance_tables() TO service_role;

-- Recreate refresh_daily_metrics
DROP FUNCTION IF EXISTS public.refresh_daily_metrics();

CREATE OR REPLACE FUNCTION public.refresh_daily_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_appointment_metrics;
  RAISE NOTICE 'Materialized view refreshed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_daily_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_daily_metrics() TO service_role;

-- Add get_query_statistics function
CREATE OR REPLACE FUNCTION public.get_query_statistics()
RETURNS TABLE (
  table_name TEXT,
  seq_scan BIGINT,
  idx_scan BIGINT,
  idx_scan_ratio DECIMAL,
  table_size TEXT,
  index_size TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  schemaname || '.' || relname as table_name,
  seq_scan,
  COALESCE(idx_scan, 0) as idx_scan,
  CASE
    WHEN (seq_scan + COALESCE(idx_scan, 0)) > 0
    THEN ROUND((COALESCE(idx_scan, 0)::DECIMAL / (seq_scan + COALESCE(idx_scan, 0)) * 100), 2)
    ELSE 0
  END as idx_scan_ratio,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname || '.' || relname)) as index_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (seq_scan > 1000 OR idx_scan > 1000)
ORDER BY seq_scan DESC, idx_scan DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_query_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_query_statistics() TO service_role;

-- Add warm_query_cache function
CREATE OR REPLACE FUNCTION public.warm_query_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dummy INTEGER;
BEGIN
  SELECT COUNT(*) INTO dummy FROM public.appointments WHERE date >= CURRENT_DATE LIMIT 1;
  SELECT COUNT(*) INTO dummy FROM public.patients WHERE status = 'active' LIMIT 1;
  RAISE NOTICE 'Query cache warmed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.warm_query_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.warm_query_cache() TO service_role;

-- ============================================================================
-- Critical Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_realtime_filter
  ON public.appointments(status, date, organization_id)
  WHERE status IN ('confirmed', 'in_progress', 'pending');

CREATE INDEX IF NOT EXISTS idx_profiles_role_organization
  ON public.profiles(role, organization_id)
  WHERE role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_status_active
  ON public.patients(status, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_eventos_org_active
  ON public.eventos(organization_id, status)
  WHERE status = 'active';

-- Composite index for appointment queries by organization, status and date
CREATE INDEX IF NOT EXISTS idx_appointments_org_status_date
  ON public.appointments(organization_id, status, date DESC);
