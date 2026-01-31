/**
 * Daily Reports Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - supabase.from().select() → firestore.collection().get()
 * - .eq() → .where()
 * - .gte().lt() → .where() with date range
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, DailyReportPayload, InngestStep } from '../../lib/inngest/types.js';
import { fisioLogger as logger } from '../../lib/errors/logger.js';
import { getAdminDb } from '../../lib/firebase/admin.js';

// Types for organizations and sessions
interface Organization {
  id: string;
  name?: string;
  active: boolean;
  settings?: Record<string, unknown>;
}

interface SessionRecord {
  id: string;
  therapist_id?: string;
  organization_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

export const dailyReportsWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-daily-reports',
    name: 'Daily Reports Generation',
    retries: retryConfig.email.maxAttempts,
  },
  [
    { event: Events.CRON_DAILY_REPORTS },
    { cron: '0 8 * * *' }, // 8:00 AM daily
  ],
  async ({ step }: {
    event: { data: DailyReportPayload }; step: InngestStep
  }) => {
    const db = getAdminDb();

    // Calculate date range for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Get all active organizations
    const organizations = await step.run('get-organizations', async (): Promise<Organization[]> => {
      const snapshot = await db.collection('organizations')
        .where('active', '==', true)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    if (organizations.length === 0) {
      logger.info('No active organizations found', {}, 'daily-reports');
      return {
        success: true,
        reportsGenerated: 0,
        emailsSent: 0,
        organizationsProcessed: 0,
        timestamp: new Date().toISOString(),
        message: 'No active organizations',
      };
    }

    // Step 2: Process each organization in parallel
    const results = await step.run(
      'process-organizations',
      async (): Promise<{
        organizationId: string;
        organizationName?: string;
        reportsGenerated: number;
        emailsSent: number;
        skipped?: boolean;
        error?: string;
        reportData?: {
          organization?: string;
          date: string;
          totalSessions: number;
          sessionsByTherapist: Record<string, number>;
        };
      }[]> => {
        return await Promise.all(
          organizations.map(async (org: { id: string; name?: string; settings?: Record<string, unknown> }) => {
            try {
              // Get therapists who should receive daily reports
              const therapistsSnapshot = await db.collection('profiles')
                .where('organization_id', '==', org.id)
                .where('active', '==', true)
                .where('receive_daily_reports', '==', true)
                .get();

              const therapists = therapistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

              if (therapists.length === 0) {
                return {
                  organizationId: org.id,
                  organizationName: org.name,
                  reportsGenerated: 0,
                  emailsSent: 0,
                  skipped: true,
                  reason: 'No therapists with daily reports enabled',
                };
              }

              // Get yesterday's sessions for this organization
              const sessionsSnapshot = await db.collection('soap_records')
                .where('organization_id', '==', org.id)
                .where('created_at', '>=', yesterday.toISOString())
                .where('created_at', '<', today.toISOString())
                .get();

              const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

              // Generate report data
              const reportData = {
                organization: org.name,
                date: yesterday.toISOString().split('T')[0],
                totalSessions: sessions.length,
                sessionsByTherapist: sessions.reduce((acc: Record<string, number>, session: SessionRecord) => {
                  const therapistId = session.therapist_id || 'unassigned';
                  acc[therapistId] = (acc[therapistId] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
              };

              // Send reports to therapists
              let emailsSent = 0;
              for (const therapist of therapists) {
                try {
                  // TODO: Send via Resend
                  logger.info(
                    `Sending daily report to therapist for org`,
                    { organizationId: org.id, organizationName: org.name, therapistId: therapist.id },
                    'daily-reports'
                  );
                  emailsSent++;
                } catch (error) {
                  logger.error(`Failed to send report to therapist`, error, 'daily-reports');
                }
              }

              return {
                organizationId: org.id,
                organizationName: org.name,
                reportsGenerated: 1,
                emailsSent,
                reportData,
              };
            } catch (error) {
              logger.error(`Error processing organization ${org.id}`, error, 'daily-reports');
              return {
                organizationId: org.id,
                organizationName: org.name,
                error: error instanceof Error ? error.message : 'Unknown error',
                reportsGenerated: 0,
                emailsSent: 0,
              };
            }
          })
        );
      }
    );

    const totalReports = results.reduce(
      (sum: number, r: { reportsGenerated?: number }) => sum + (r.reportsGenerated || 0),
      0
    );
    const totalEmails = results.reduce(
      (sum: number, r: { emailsSent?: number }) => sum + (r.emailsSent || 0),
      0
    );

    logger.info(
      `Daily reports completed`,
      { totalReports, totalEmails, organizationsProcessed: organizations.length },
      'daily-reports'
    );

    return {
      success: true,
      reportsGenerated: totalReports,
      emailsSent: totalEmails,
      organizationsProcessed: organizations.length,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);
