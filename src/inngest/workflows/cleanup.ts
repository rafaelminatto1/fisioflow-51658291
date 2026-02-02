/**
 * Cleanup Workflow - Migrated to Firebase
 *
 */
import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, CleanupPayload, CleanupResult, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb } from '../../lib/firebase/admin.js';
import { deleteByQuery } from '../../lib/firebase/admin.js';
import { logger } from '@/lib/errors/logger.js';

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
    const db = getAdminDb();

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
    const notificationResult = (await step.run(
      'cleanup-old-notifications',
      async (): Promise<number> => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        return await deleteByQuery(
          'notification_history',
          'created_at',
          '<',
          ninetyDaysAgo.toISOString(),
          { maxDeletes: 10000 } // Safety limit
        );
      }
    )) as number;
    result.deletedRecords.notificationHistory = notificationResult;

    // Step 2: Clean up expired password reset tokens (older than 24 hours)
    const resetTokensResult = (await step.run(
      'cleanup-expired-tokens',
      async (): Promise<number> => {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        try {
          return await deleteByQuery(
            'password_reset_tokens',
            'created_at',
            '<',
            twentyFourHoursAgo.toISOString(),
            { maxDeletes: 5000 }
          );
        } catch (error) {
          result.errors.push(`Password tokens cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return 0;
        }
      }
    )) as number;
    result.deletedRecords.passwordResetTokens = resetTokensResult;

    // Step 3: Clean up old system health logs (older than 30 days)
    const healthLogsResult = (await step.run(
      'cleanup-old-health-logs',
      async (): Promise<number> => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        try {
          return await deleteByQuery(
            'system_health_logs',
            'created_at',
            '<',
            thirtyDaysAgo.toISOString(),
            { maxDeletes: 5000 }
          );
        } catch (error) {
          result.errors.push(`Health logs cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return 0;
        }
      }
    )) as number;
    result.deletedRecords.systemHealthLogs = healthLogsResult;

    // Step 4: Clean up incomplete sessions (older than 7 days)
    const sessionsResult = (await step.run('cleanup-incomplete-sessions', async (): Promise<number> => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      try {
        const snapshot = await db.collection('soap_records')
          .where('status', '==', 'in_progress')
          .where('updated_at', '<', sevenDaysAgo.toISOString())
          .limit(500)
          .get();

        if (snapshot.empty) {
          return 0;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        return snapshot.docs.length;
      } catch (error) {
        result.errors.push(`Sessions cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return 0;
      }
    })) as number;
    result.deletedRecords.incompleteSessions = sessionsResult;

    // Step 5: Expire stale waitlist offers
    const expiredOffersResult = (await step.run('expire-stale-waitlist-offers', async (): Promise<number> => {
      const now = new Date().toISOString();

      try {
        const snapshot = await db.collection('waitlist')
          .where('status', '==', 'offered')
          .where('offer_expires_at', '<', now)
          .limit(500)
          .get();

        if (snapshot.empty) {
          return 0;
        }

        const batch = db.batch();
        let processedCount = 0;

        snapshot.docs.forEach((docSnap) => {
          const offer = docSnap.data();
          const newRefusalCount = (offer.refusal_count || 0) + 1;
          const newStatus = newRefusalCount >= 3 ? 'removed' : 'waiting';

          batch.update(docSnap.ref, {
            status: newStatus,
            offered_slot: null,
            offered_at: null,
            offer_expires_at: null,
            refusal_count: newRefusalCount,
          });
          processedCount++;
        });

        await batch.commit();
        return processedCount;
      } catch (error) {
        result.errors.push(`Expired offers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return 0;
      }
    })) as number;
    (result.deletedRecords as Record<string, number>).expiredWaitlistOffers = expiredOffersResult;

    // Log completion
    await step.run('log-cleanup-summary', async () => {
      logger.info('[Cleanup] Completed', {
        notificationHistory: result.deletedRecords.notificationHistory,
        passwordResetTokens: result.deletedRecords.passwordResetTokens,
        systemHealthLogs: result.deletedRecords.systemHealthLogs,
        incompleteSessions: result.deletedRecords.incompleteSessions,
        errors: result.errors,
      }, 'cleanup-workflow');
      return true;
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    };
  }
);
