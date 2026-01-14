-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- Drop and recreate get_slow_queries
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
BEGIN
  -- Ensure extension is available (double check inside function though explicit CREATE EXTENSION above handles it for the db)
  -- We query the view directly now assuming the extension is enabled.
  
  RETURN QUERY
  SELECT
    sq.queryid,
    sq.calls,
    sq.total_exec_time,
    sq.mean_exec_time,
    sq.max_exec_time,
    LEFT(sq.query, 500) as query_text
  FROM extensions.pg_stat_statements sq
  WHERE sq.calls >= min_calls
    AND sq.mean_exec_time >= min_ms
  ORDER BY sq.mean_exec_time DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_slow_queries(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(INTEGER, INTEGER) TO service_role;
