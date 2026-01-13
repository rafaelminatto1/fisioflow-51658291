// ============================================================================
// Daily Metrics Refresh Edge Function
// ============================================================================
// This function refreshes the materialized view for daily appointment metrics
// It should be called daily via Supabase scheduled tasks (cron jobs)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Verify the request is authorized (cron jobs use service role key)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing environment variables' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const startTime = Date.now()

    // Call the refresh_daily_metrics function
    const { data, error } = await supabase.rpc('refresh_daily_metrics')

    if (error) {
      throw error
    }

    const duration = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily metrics refreshed successfully',
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error refreshing daily metrics:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/daily-metrics-refresh' \
    --header 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
    --header 'Content-Type: 'application/json' ''

To deploy and set up a cron job:

  1. Deploy the function:
     supabase functions deploy daily-metrics-refresh

  2. Set up a cron job via Supabase Dashboard:
     - Go to Edge Functions > Cron Jobs
     - Add a new cron job with schedule: "0 2 * * *" (daily at 2 AM)
     - Select the daily-metrics-refresh function

Or use pg_cron directly (if enabled in your project):

  SELECT cron.schedule(
    'refresh-daily-metrics',
    '0 2 * * *',  -- Daily at 2 AM UTC
    $$
    SELECT net.http_post(
      url := 'https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1/daily-metrics-refresh',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );

*/
