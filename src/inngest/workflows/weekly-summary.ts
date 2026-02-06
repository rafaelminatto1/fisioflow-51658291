/**
 * Weekly Summary Workflow - Migrated to Firebase
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb } from '../../lib/firebase/admin.js';
import { logger } from '@/lib/errors/logger.js';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { ResendService } from '../../lib/email/resend.js';

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

      const organizations = orgSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));

      return await Promise.all(
        organizations.map(async (org: Organization) => {
          try {
            // Get sessions for the week
            const sessionsSnapshot = await db.collection('soap_records')
              .where('organization_id', '==', org.id)
              .where('created_at', '>=', lastWeek.start)
              .where('created_at', '<=', lastWeek.end)
              .get();

            const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));

            // Get new patients for the week
            const patientsSnapshot = await db.collection('patients')
              .where('organization_id', '==', org.id)
              .where('created_at', '>=', lastWeek.start)
              .where('created_at', '<=', lastWeek.end)
              .get();

            const newPatients = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));

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
      logger.info('[Weekly Summary] Sending emails', { count: results.length }, 'weekly-summary-workflow');
      
      let emailsSent = 0;
      
      for (const result of results) {
        if (result.error) continue;

        try {
          // Get therapists for this organization
          const therapistsSnapshot = await db.collection('profiles')
            .where('organization_id', '==', result.organizationId)
            .where('active', '==', true)
            .where('receive_weekly_reports', '==', true)
            .get();

          const therapists = therapistsSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));

          for (const therapist of therapists) {
            if (!therapist.email) continue;

            const startDate = new Date(result.dateRange!.start).toLocaleDateString('pt-BR');
            const endDate = new Date(result.dateRange!.end).toLocaleDateString('pt-BR');

            await ResendService.sendEmail({
              to: therapist.email,
              subject: `📊 Resumo Semanal - ${result.organizationName}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h1 style="color: #4facfe; text-align: center;">Resumo Semanal</h1>
                  <p style="text-align: center; color: #666;">Período: ${startDate} a ${endDate}</p>
                  
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px 0;"><strong>Total de sessões:</strong></td>
                        <td style="text-align: right; padding: 10px 0; font-size: 18px; color: #4facfe;">${result.totalSessions}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;"><strong>Novos pacientes:</strong></td>
                        <td style="text-align: right; padding: 10px 0; font-size: 18px; color: #8b5cf6;">${result.newPatients}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; text-align: center;">Continue acompanhando a evolução da sua clínica!</p>
                  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">Equipe FisioFlow</p>
                </div>
              `,
              tags: { type: 'weekly-summary', organization: result.organizationName || 'FisioFlow' }
            });
            emailsSent++;
          }
        } catch (error) {
          logger.error(`Error sending weekly summary for org ${result.organizationId}`, error, 'weekly-summary-workflow');
        }
      }
      
      return { emailsSent };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);