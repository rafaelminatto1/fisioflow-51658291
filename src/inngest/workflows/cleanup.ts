/**
 * Cleanup Workflow
 *
 * Migrated from /api/crons/cleanup
 * Runs daily at 3:00 AM to clean up expired data
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Idempotent operations (safe to run multiple times)
 * - Detailed logging
 */

import { inngest, retryConfig } from '@/lib/inngest/client';
import { Events, CleanupPayload, CleanupResult } from '@/lib/inngest/types';
import { createClient } from '@supabase/supabase-js';

export const cleanupWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-daily-cleanup',
    name: 'Daily Data Cleanup',
    retries: retryConfig.database.maxAttempts,
  },
  {
    event: Events.CRON_DAILY_CLEANUP,
  },
  async ({ event, step }: { event: { data: CleanupPayload }; step: any }) => {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const result: CleanupResult = {
      deletedRecords: {
        notificationHistory: 0,
        passwordResetTokens: 0,
        systemHealthLogs: 0,
        incompleteSessions: 0,
      },
      errors: [],
    };

    // Step 1: Clean up old notification logs (older than 90 days)
    const notificationResult = await step.run(
      'cleanup-old-notifications',
      async () => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { data, error, count } = await supabase
          .from('notification_history')
          .delete()
          .lt('created_at', ninetyDaysAgo.toISOString())
          .select('count', { count: 'exact', head: true });

        if (error) {
          throw new Error(`Failed to cleanup notifications: ${error.message}`);
        }

        return count || 0;
      }
    );
    result.deletedRecords.notificationHistory = notificationResult;

    // Step 2: Clean up expired password reset tokens (older than 24 hours)
    const resetTokensResult = await step.run(
      'cleanup-expired-tokens',
      async () => {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error, count } = await supabase
          .from('password_reset_tokens')
          .delete()
          .lt('created_at', twentyFourHoursAgo.toISOString())
          .select('count', { count: 'exact', head: true });

        if (error) {
          result.errors.push(`Password tokens cleanup: ${error.message}`);
          return 0;
        }

        return count || 0;
      }
    );
    result.deletedRecords.passwordResetTokens = resetTokensResult;

    // Step 3: Clean up old system health logs (older than 30 days)
    const healthLogsResult = await step.run(
      'cleanup-old-health-logs',
      async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error, count } = await supabase
          .from('system_health_logs')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString())
          .select('count', { count: 'exact', head: true });

        if (error) {
          result.errors.push(`Health logs cleanup: ${error.message}`);
          return 0;
        }

        return count || 0;
      }
    );
    result.deletedRecords.systemHealthLogs = healthLogsResult;

    // Step 4: Clean up incomplete sessions (older than 7 days)
    const sessionsResult = await step.run('cleanup-incomplete-sessions', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error, count } = await supabase
        .from('sessions')
        .delete()
        .eq('status', 'in_progress')
        .lt('updated_at', sevenDaysAgo.toISOString())
        .select('count', { count: 'exact', head: true });

      if (error) {
        result.errors.push(`Sessions cleanup: ${error.message}`);
        return 0;
      }

      return count || 0;
    });
    result.deletedRecords.incompleteSessions = sessionsResult;

    // Log completion
    await step.run('log-cleanup-summary', async () => {
      console.log('Cleanup completed:', {
        notificationHistory: result.deletedRecords.notificationHistory,
        passwordResetTokens: result.deletedRecords.passwordResetTokens,
        systemHealthLogs: result.deletedRecords.systemHealthLogs,
        incompleteSessions: result.deletedRecords.incompleteSessions,
        errors: result.errors,
      });
      return true;
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    };
  }
);
