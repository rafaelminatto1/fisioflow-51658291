/**
 * Cleanup Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, CleanupPayload, CleanupResult, InngestStep } from '../../lib/inngest/types.js';
import { logger } from '@/lib/errors/logger.js';
import { 
  deleteOldRecords, 
  cleanupIncompleteSessions 
} from './_shared/neon-patients-appointments';

export const cleanupWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-daily-cleanup',
    name: 'Daily Data Cleanup',
    retries: retryConfig.database.maxAttempts,
  },
  {
    event: Events.CRON_DAILY_CLEANUP,
  },
  async ({ step }: { event: { data: CleanupPayload }; step: InngestStep }) => {
    const result: CleanupResult = {
      deletedRecords: {
        notificationHistory: 0,
        passwordResetTokens: 0,
        systemHealthLogs: 0,
        incompleteSessions: 0,
      },
      errors: [],
    };

    // Step 1: Clean up old notification logs (Neon)
    result.deletedRecords.notificationHistory = await step.run(
      'cleanup-old-notifications',
      async (): Promise<number> => {
        return await deleteOldRecords('notification_history', 'created_at', 90);
      }
    );

    // Step 2: Clean up expired password reset tokens (Neon)
    result.deletedRecords.passwordResetTokens = await step.run(
      'cleanup-expired-tokens',
      async (): Promise<number> => {
        return await deleteOldRecords('password_reset_tokens', 'created_at', 1);
      }
    );

    // Step 3: Clean up incomplete sessions (Neon)
    result.deletedRecords.incompleteSessions = await step.run(
      'cleanup-incomplete-sessions',
      async (): Promise<number> => {
        return await cleanupIncompleteSessions(7);
      }
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    };
  }
);
