-- Fix security: Block direct API access to materialized views with RLS

-- Enable RLS on materialized views to block direct API access
ALTER MATERIALIZED VIEW public.monthly_metrics OWNER TO postgres;
ALTER MATERIALIZED VIEW public.financial_metrics OWNER TO postgres;
ALTER MATERIALIZED VIEW public.clinical_metrics OWNER TO postgres;  
ALTER MATERIALIZED VIEW public.patient_analytics OWNER TO postgres;

-- Create RLS policies that deny all direct access (forcing use of functions)
CREATE POLICY "Block direct access to monthly_metrics" ON public.monthly_metrics FOR ALL USING (false);
CREATE POLICY "Block direct access to financial_metrics" ON public.financial_metrics FOR ALL USING (false);
CREATE POLICY "Block direct access to clinical_metrics" ON public.clinical_metrics FOR ALL USING (false);
CREATE POLICY "Block direct access to patient_analytics" ON public.patient_analytics FOR ALL USING (false);