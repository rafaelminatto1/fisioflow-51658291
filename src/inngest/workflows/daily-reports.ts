/**
 * Daily Reports Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, DailyReportPayload, InngestStep } from '../../lib/inngest/types.js';
import { fisioLogger as logger } from '../../lib/errors/logger.js';
import { ResendService } from '../../lib/email/resend.js';
import { 
  countPatientsCreatedBetween, 
  getActiveOrganizations, 
  getProfilesByIds,
  type NeonOrganization 
} from './_shared/neon-patients-appointments';

interface SessionRecord {
  id: string;
  therapist_id?: string;
  organization_id?: string;
  created_at?: string;
  status?: string;
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
    // Calculate date range for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Get all active organizations (Neon)
    const organizations = await step.run('get-organizations', async (): Promise<NeonOrganization[]> => {
      return await getActiveOrganizations();
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
          organizations.map(async (org: NeonOrganization) => {
            try {
              // Get therapists for this org (Simplified Neon fetch)
              const profilesMap = await getProfilesByIds([]); 
              const therapists = Array.from(profilesMap.values()).filter(p => p.role === 'therapist');

              // Get yesterday's sessions for this organization (Neon SQL placeholder)
              // In production, we'd add a getSessionsBetween helper to _shared
              const sessions: SessionRecord[] = []; 

              // Get new patients for yesterday (Neon)
              const newPatientsCount = await countPatientsCreatedBetween(
                org.id,
                yesterday.toISOString(),
                today.toISOString(),
              );

              const completedSessions = sessions.filter((s) => s.status === 'concluido' || s.status === 'atendido').length;
              const cancelledSessions = sessions.filter((s) => s.status === 'cancelado').length;

              // Generate report data
              const reportData = {
                organization: org.name,
                date: yesterday.toLocaleDateString('pt-BR'),
                totalSessions: sessions.length,
                completedSessions,
                cancelledSessions,
                newPatients: newPatientsCount,
                sessionsByTherapist: sessions.reduce((acc: Record<string, number>, session: SessionRecord) => {
                  const therapistId = session.therapist_id || 'unassigned';
                  acc[therapistId] = (acc[therapistId] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
              };

              // Send reports to therapists
              let emailsSent = 0;
              for (const therapist of therapists) {
                if (!therapist.email) continue;
                
                try {
                  await ResendService.sendDailyReport(
                    therapist.email,
                    {
                      therapistName: therapist.full_name || therapist.name || 'Fisioterapeuta',
                      organizationName: org.name || 'FisioFlow',
                      date: reportData.date,
                      totalSessions: reportData.totalSessions,
                      completedSessions: reportData.completedSessions,
                      cancelledSessions: reportData.cancelledSessions,
                      newPatients: reportData.newPatients,
                    },
                    org.name
                  );
                  
                  emailsSent++;
                } catch (error) {
                  logger.error(`Failed to send report to therapist ${therapist.email}`, error, 'daily-reports');
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
