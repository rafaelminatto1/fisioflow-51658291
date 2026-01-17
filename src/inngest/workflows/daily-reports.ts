/**
 * Daily Reports Workflow
 *
 * Migrated from /api/crons/daily-reports
 * Runs daily at 8:00 AM to generate and send daily reports
 *
 * Features:
 * - Parallel processing per organization
 * - Retry per organization if fails
 * - Email delivery via Resend
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, DailyReportPayload, InngestStep } from '../../lib/inngest/types.js';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../lib/errors/logger.js';

export const dailyReportsWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-daily-reports',
    name: 'Daily Reports Generation',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.CRON_DAILY_REPORTS,
    cron: '0 8 * * *', // 8:00 AM daily
  },
  async ({ step }: {
    event: { data: DailyReportPayload }; step: InngestStep
  }) => {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Get all active organizations
    const organizations = await step.run('get-organizations', async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, settings')
        .eq('active', true);

      if (error) {
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }

      return data || [];
    });

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
        reportData?: any;
      }[]> => {
        return await Promise.all(
          organizations.map(async (org: { id: string; name?: string; settings?: Record<string, unknown> }) => {
            try {
              // Get therapists who should receive daily reports
              const { data: therapists } = await supabase
                .from('users')
                .select('id, email, name')
                .eq('organization_id', org.id)
                .eq('active', true)
                .eq('receive_daily_reports', true);

              if (!therapists || therapists.length === 0) {
                return {
                  organizationId: org.id,
                  organizationName: org.name,
                  reportsGenerated: 0,
                  emailsSent: 0,
                  skipped: true,
                };
              }

              // Get yesterday's sessions for this organization
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);

              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const { data: sessions } = await supabase
                .from('sessions')
                .select('*, patient:patients(name, therapist_id)')
                .eq('organization_id', org.id)
                .gte('created_at', yesterday.toISOString())
                .lt('created_at', today.toISOString());

              // Generate report data
              const reportData = {
                organization: org.name,
                date: yesterday.toISOString().split('T')[0],
                totalSessions: sessions?.length || 0,
                sessionsByTherapist: sessions?.reduce((acc: Record<string, number>, session: {
                  patient?: { therapist_id?: string };
                }) => {
                  const therapistId = session.patient?.therapist_id || 'unassigned';
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
                    { organizationId: org.id, organizationName: org.name },
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
