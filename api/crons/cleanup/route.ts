/**
 * Vercel Cron Job: Cleanup Expired Data
 * Runs every day at 3:00 AM
 * Cleans up expired sessions, old logs, and temporary data
 */

import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return authHeader === `Bearer ${cronSecret}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!verifyCronSecret(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    console.log('Starting cleanup cron job...');

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Clean up old notification logs (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error: notificationError } = await supabase
      .from('notification_history')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString());

    if (notificationError) {
      console.error('Error cleaning up notification_history:', notificationError);
    }

    // Clean up expired password reset tokens (older than 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { error: resetError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('created_at', twentyFourHoursAgo.toISOString());

    if (resetError) {
      console.error('Error cleaning up password_reset_tokens:', resetError);
    }

    // Clean up old system health logs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: healthError } = await supabase
      .from('system_health_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (healthError) {
      console.error('Error cleaning up system_health_logs:', healthError);
    }

    // Clean up incomplete sessions (older than 7 days with no updates)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { error: sessionError } = await supabase
      .from('sessions')
      .delete()
      .eq('status', 'in_progress')
      .lt('updated_at', sevenDaysAgo.toISOString());

    if (sessionError) {
      console.error('Error cleaning up incomplete sessions:', sessionError);
    }

    console.log('Cleanup cron job completed successfully');

    return jsonResponse({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Cleanup completed successfully',
    });
  } catch (error) {
    console.error('Cleanup cron job error:', error);
    return jsonResponse(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
