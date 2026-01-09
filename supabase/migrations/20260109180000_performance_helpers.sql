-- Migration: Add Performance Helpers
-- Description: Adds functions to analyze table sizes and index usage.

-- Enable pg_stat_statements if possible (often requires superuser, might fail on some setups but worth trying or assuming it's on)
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Commented out as it often requires superuser privileges that we might not have in migration context directly, but usually enabled on Supabase.

-- Function to get table sizes
CREATE OR REPLACE FUNCTION public.get_table_sizes()
RETURNS TABLE (
    table_name text,
    row_count bigint,
    total_size text,
    index_size text,
    toast_size text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_indexes_size(relid)) as index_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid) - pg_indexes_size(relid)) as toast_size
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC;
END;
$$;

-- Function to check cache hit ratio (simplified)
CREATE OR REPLACE FUNCTION public.get_cache_hit_ratio()
RETURNS TABLE (
    ratio numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric * 100
    FROM pg_statio_user_tables;
END;
$$;

-- Function to identify unused indexes
CREATE OR REPLACE FUNCTION public.get_unused_indexes()
RETURNS TABLE (
    schema_name text,
    table_name text,
    index_name text,
    index_size text,
    index_scans bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.schemaname::text,
        s.relname::text,
        s.indexrelname::text,
        pg_size_pretty(pg_relation_size(s.indexrelid))::text,
        s.idx_scan
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.idx_scan < 50 -- Threshold for "unused"
    AND i.indisunique IS FALSE -- Keep unique indexes as they enforce constraints
    ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_table_sizes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cache_hit_ratio() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unused_indexes() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_table_sizes() IS 'Returns size and row information for all user tables';
COMMENT ON FUNCTION public.get_cache_hit_ratio() IS 'Returns the overall cache hit ratio for user tables';
COMMENT ON FUNCTION public.get_unused_indexes() IS 'Returns indexes with low usage counts (excluding unique constraints)';
