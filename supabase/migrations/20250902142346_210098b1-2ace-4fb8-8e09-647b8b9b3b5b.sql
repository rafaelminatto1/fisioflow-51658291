-- Fix security issues: Set search_path and restrict materialized view access

-- Fix function search path
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.monthly_metrics;
  REFRESH MATERIALIZED VIEW public.financial_metrics;  
  REFRESH MATERIALIZED VIEW public.clinical_metrics;
  REFRESH MATERIALIZED VIEW public.patient_analytics;
END;
$$;

-- Create secure analytics functions to access materialized views instead of direct access
CREATE OR REPLACE FUNCTION public.get_monthly_metrics(start_date DATE DEFAULT CURRENT_DATE - INTERVAL '12 months')
RETURNS TABLE(
  month TIMESTAMP WITH TIME ZONE,
  unique_patients BIGINT,
  total_appointments BIGINT,
  confirmed_appointments BIGINT,
  cancelled_appointments BIGINT,
  attendance_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.month,
    m.unique_patients,
    m.total_appointments,
    m.confirmed_appointments,
    m.cancelled_appointments,
    m.attendance_rate
  FROM public.monthly_metrics m
  WHERE m.month >= start_date
  ORDER BY m.month;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_financial_metrics(start_date DATE DEFAULT CURRENT_DATE - INTERVAL '12 months')
RETURNS TABLE(
  month TIMESTAMP WITH TIME ZONE,
  total_purchases BIGINT,
  total_revenue NUMERIC,
  avg_ticket NUMERIC,
  unique_customers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.month,
    f.total_purchases,
    f.total_revenue,
    f.avg_ticket,
    f.unique_customers
  FROM public.financial_metrics f
  WHERE f.month >= start_date
  ORDER BY f.month;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_clinical_metrics(start_date DATE DEFAULT CURRENT_DATE - INTERVAL '12 months')
RETURNS TABLE(
  month TIMESTAMP WITH TIME ZONE,
  total_sessions BIGINT,
  avg_pain_level NUMERIC,
  treated_patients BIGINT,
  avg_session_duration NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.month,
    c.total_sessions,
    c.avg_pain_level,
    c.treated_patients,
    c.avg_session_duration
  FROM public.clinical_metrics c  
  WHERE c.month >= start_date
  ORDER BY c.month;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_patient_analytics()
RETURNS TABLE(
  status TEXT,
  count BIGINT,
  avg_age NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.status,
    p.count,
    p.avg_age
  FROM public.patient_analytics p;
END;
$$;