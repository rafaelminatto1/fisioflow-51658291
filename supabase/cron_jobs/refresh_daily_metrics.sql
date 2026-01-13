-- Neon Cron Job: Refresh Daily Metrics
-- This function is scheduled to run daily to refresh the materialized view
--
-- To schedule this in Neon Console:
-- 1. Go to your project > Cron Jobs
-- 2. Create new cron job
-- 3. Set schedule: 0 2 * * * (daily at 2 AM)
-- 4. Command: SELECT refresh_daily_metrics();

-- Verify the function exists
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'refresh_daily_metrics';
