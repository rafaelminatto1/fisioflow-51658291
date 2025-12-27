-- Create analytics snapshots table for historical metrics
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create materialized views for performance
DROP MATERIALIZED VIEW IF EXISTS public.monthly_metrics;
CREATE MATERIALIZED VIEW public.monthly_metrics AS
SELECT 
  DATE_TRUNC('month', appointment_date) as month,
  COUNT(DISTINCT patient_id) as unique_patients,
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN status = 'Confirmado' THEN 1 END) as confirmed_appointments,
  COUNT(CASE WHEN status = 'Cancelado' THEN 1 END) as cancelled_appointments,
  AVG(CASE WHEN status = 'Confirmado' THEN 1.0 ELSE 0.0 END) as attendance_rate
FROM appointments
WHERE appointment_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 1
ORDER BY 1;

-- Create financial metrics view
DROP MATERIALIZED VIEW IF EXISTS public.financial_metrics;
CREATE MATERIALIZED VIEW public.financial_metrics AS
SELECT 
  DATE_TRUNC('month', purchase_date) as month,
  COUNT(*) as total_purchases,
  SUM(amount_paid) as total_revenue,
  AVG(amount_paid) as avg_ticket,
  COUNT(DISTINCT patient_id) as unique_customers
FROM voucher_purchases
WHERE status = 'active'
  AND purchase_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 1
ORDER BY 1;

-- Create clinical metrics view
DROP MATERIALIZED VIEW IF EXISTS public.clinical_metrics;
CREATE MATERIALIZED VIEW public.clinical_metrics AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_sessions,
  AVG(pain_level) as avg_pain_level,
  COUNT(DISTINCT patient_id) as treated_patients,
  AVG(duration_minutes) as avg_session_duration
FROM treatment_sessions
WHERE created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 1
ORDER BY 1;

-- Create patient analytics view
DROP MATERIALIZED VIEW IF EXISTS public.patient_analytics;
CREATE MATERIALIZED VIEW public.patient_analytics AS
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(YEAR FROM AGE(birth_date))) as avg_age
FROM patients
GROUP BY status;

-- Create refresh function for materialized views
-- NOTE: Skipped due to conflict with existing function that returns TRIGGER
-- This function can be created manually if needed
-- DO $$
-- BEGIN
--     EXECUTE '
--     CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
--     RETURNS void AS $func$
--     BEGIN
--       REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_metrics;
--       REFRESH MATERIALIZED VIEW CONCURRENTLY financial_metrics;
--       REFRESH MATERIALIZED VIEW CONCURRENTLY clinical_metrics;
--       REFRESH MATERIALIZED VIEW CONCURRENTLY patient_analytics;
--     END;
--     $func$ LANGUAGE plpgsql SECURITY DEFINER;
--     ';
-- EXCEPTION
--     WHEN OTHERS THEN
--         NULL;
-- END $$;

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  query_config JSONB NOT NULL,
  template_type TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  schedule_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report executions table
CREATE TABLE IF NOT EXISTS public.report_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  executed_by UUID REFERENCES auth.users(id),
  execution_params JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff can view analytics" ON analytics_snapshots FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'fisioterapeuta')
));

CREATE POLICY "Staff can manage reports" ON reports FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'fisioterapeuta')
));

CREATE POLICY "Users can view their report executions" ON report_executions FOR SELECT
USING (executed_by = auth.uid());

CREATE POLICY "Users can create report executions" ON report_executions FOR INSERT
WITH CHECK (executed_by = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_analytics_snapshots_date_type ON analytics_snapshots(snapshot_date, metric_type);
CREATE INDEX idx_monthly_metrics_month ON monthly_metrics(month);
CREATE INDEX idx_financial_metrics_month ON financial_metrics(month);
CREATE INDEX idx_clinical_metrics_month ON clinical_metrics(month);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_report_executions_report_id ON report_executions(report_id);

-- Add trigger to refresh views daily
-- NOTE: Skipped due to function signature conflict
-- DROP TRIGGER IF EXISTS refresh_analytics_trigger ON appointments;
-- CREATE TRIGGER refresh_analytics_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON appointments
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION refresh_analytics_views();