-- ============================================================================
-- Daily Metrics Refresh Cron Job Configuration
-- ============================================================================
-- This sets up a cron job to automatically refresh the materialized view
-- Note: pg_cron extension needs to be enabled in Supabase Dashboard
-- ============================================================================

-- First, enable pg_cron extension (if available)
-- This requires superuser privileges, so it must be done via Dashboard
-- or by Supabase support. Uncomment the line below if you have access:

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Check if pg_cron is available and schedule the job
DO $body$
BEGIN
  -- Check if cron.schedule function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'schedule' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'cron')
  ) THEN
    -- Schedule the daily metrics refresh job to run daily at 2 AM UTC
    -- Adjust the time zone as needed for your region
    PERFORM cron.schedule(
      'refresh-daily-metrics',
      '0 2 * * *',
      'SELECT refresh_daily_metrics()'
    );

    RAISE NOTICE 'Cron job "refresh-daily-metrics" scheduled for daily execution at 2 AM UTC';
  ELSE
    RAISE NOTICE 'pg_cron extension is not available. Please enable it in Supabase Dashboard > Database > Extensions, or use Supabase Scheduled Tasks (Cron Jobs) in the Edge Functions section.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
    RAISE NOTICE 'You can set up a scheduled task in Supabase Dashboard > Edge Functions > Scheduled Tasks';
END $body$;

-- ============================================================================
-- Alternative: Use pg_cron with HTTP call to Edge Function
-- ============================================================================
-- If you have deployed the daily-metrics-refresh Edge Function,
-- you can use this instead:

-- PERFORM cron.schedule(
--   'refresh-daily-metrics-via-function',
--   '0 2 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1/daily-metrics-refresh',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ============================================================================
-- Manual Refresh
-- ============================================================================
-- To manually refresh the metrics at any time:
--   SELECT refresh_daily_metrics();

-- To view scheduled cron jobs:
--   SELECT * FROM cron.job;

-- To unschedule a job:
--   SELECT cron.unschedule('refresh-daily-metrics');
