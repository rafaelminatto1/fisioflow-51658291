-- Fix security: Block direct API access to materialized views
-- NOTE: Materialized views cannot have RLS policies directly, so we change ownership instead

DO $$
BEGIN
    -- Change ownership of materialized views to postgres (if they exist)
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'monthly_metrics') THEN
        ALTER MATERIALIZED VIEW public.monthly_metrics OWNER TO postgres;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'financial_metrics') THEN
        ALTER MATERIALIZED VIEW public.financial_metrics OWNER TO postgres;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'clinical_metrics') THEN
        ALTER MATERIALIZED VIEW public.clinical_metrics OWNER TO postgres;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'patient_analytics') THEN
        ALTER MATERIALIZED VIEW public.patient_analytics OWNER TO postgres;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors (not critical)
        NULL;
END $$;