/**
 * Weekly Summary Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - supabase.from().select() → firestore.collection().get()
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb } from '../../lib/firebase/admin.js';

type DateRange = { start: string; end: string };
type Organization = { id: string; name?: string };

export const weeklySummaryWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-weekly-summary',
    name: 'Weekly Summary Reports',
    retries: retryConfig.email.maxAttempts,
  },
  [
    { event: Events.CRON_WEEKLY_SUMMARY },
    { cron: '0 9 * * 1' }, // 9:00 AM every Monday
  ],
  async ({ step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const db = getAdminDb();

    // Calculate date range for last week
    const lastWeek = await step.run('calculate-date-range', async (): Promise<DateRange> => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - daysSinceMonday);
      thisMonday.setHours(0, 0, 0, 0);

      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);

      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(thisMonday.getDate() - 1);
      lastSunday.setHours(23, 59, 59, 999);

      return {
        start: lastMonday.toISOString(),
        end: lastSunday.toISOString(),
      };
    });

    // Get organizations and generate reports
    const results = await step.run('generate-weekly-reports', async () => {
      const orgSnapshot = await db.collection('organizations')
        .where('active', '==', true)
        .get();

      const organizations = orgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return await Promise.all(
        organizations.map(async (org: any) => {
          try {
            // Get sessions for the week
            const sessionsSnapshot = await db.collection('soap_records')
              .where('organization_id', '==', org.id)
              .where('created_at', '>=', lastWeek.start)
              .where('created_at', '<=', lastWeek.end)
              .get();

            const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get new patients for the week
            const patientsSnapshot = await db.collection('patients')
              .where('organization_id', '==', org.id)
              .where('created_at', '>=', lastWeek.start)
              .where('created_at', '<=', lastWeek.end)
              .get();

            const newPatients = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            return {
              organizationId: org.id,
              organizationName: org.name,
              totalSessions: sessions.length,
              newPatients: newPatients.length,
              dateRange: lastWeek,
            };
          } catch (error) {
            return {
              organizationId: org.id,
              organizationName: org.name,
              error: error instanceof Error ? error.message : 'Unknown error',
              totalSessions: 0,
              newPatients: 0,
            };
          }
        })
      );
    });

    // Send emails to therapists
    await step.run('send-summary-emails', async () => {
      console.log('[Weekly Summary] Reports generated:', results.length);
      // TODO: Implement email sending via Resend
      return true;
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);
