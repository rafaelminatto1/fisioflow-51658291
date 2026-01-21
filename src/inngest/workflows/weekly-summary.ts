/**
 * Weekly Summary Workflow
 *
 * Migrated from /api/crons/weekly-summary
 * Runs every Monday at 9:00 AM to send weekly summary reports
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { createClient } from '@supabase/supabase-js';

// Define types for steps
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
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('active', true);

      if (!organizations) {
        throw new Error('Failed to fetch organizations');
      }

      return await Promise.all(
        (organizations as Organization[]).map(async (org) => {
          // Get sessions for the week
          const { data: sessions } = await supabase
            .from('sessions')
            .select('id, created_at, patient:patients(name, therapist_id)')
            .eq('organization_id', org.id)
            .gte('created_at', lastWeek.start)
            .lte('created_at', lastWeek.end);

          // Get new patients for the week
          const { data: newPatients } = await supabase
            .from('patients')
            .select('id, name')
            .eq('organization_id', org.id)
            .gte('created_at', lastWeek.start)
            .lte('created_at', lastWeek.end);

          return {
            organizationId: org.id,
            organizationName: org.name,
            totalSessions: sessions?.length || 0,
            newPatients: newPatients?.length || 0,
            dateRange: lastWeek,
          };
        })
      );
    });

    // Send emails to therapists
    await step.run('send-summary-emails', async () => {
      const { ResendService } = await import('../../lib/email/index.js');
      let emailsSent = 0;

      for (const result of results) {
        // Get therapists who should receive weekly summaries
        const { data: therapists } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('organization_id', result.organizationId)
          .eq('active', true)
          .eq('receive_weekly_summary', true);

        if (!therapists || therapists.length === 0) continue;

        // Send weekly summary email to each therapist
        for (const therapist of therapists) {
          try {
            await ResendService.sendEmail({
              to: therapist.email,
              subject: `Resumo Semanal - ${result.dateRange.start.split('T')[0]} a ${result.dateRange.end.split('T')[0]}`,
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Semanal</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📊 Resumo Semanal</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${therapist.name || 'Fisioterapeuta'}</strong>,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Aqui está o resumo da semana:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;"><strong>Período:</strong></td>
          <td style="text-align: right; padding: 10px 0;">${result.dateRange.start.split('T')[0]} a ${result.dateRange.end.split('T')[0]}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;"><strong>Total de sessões:</strong></td>
          <td style="text-align: right; padding: 10px 0; font-size: 18px; color: #667eea;">${result.totalSessions}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Novos pacientes:</strong></td>
          <td style="text-align: right; padding: 10px 0; color: #10b981;">${result.newPatients}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #666;">Continue com o excelente trabalho!</p>

    <div style="text-align: center; margin-top: 30px;">
      <p style="font-size: 14px; color: #999;">${result.organizationName || 'FisioFlow'}</p>
    </div>
  </div>
</body>
</html>
              `.trim(),
              tags: {
                type: 'weekly-summary',
                organization: result.organizationId,
              },
            });

            emailsSent++;
          } catch (error) {
            console.error(`Failed to send weekly summary to ${therapist.email}:`, error);
          }
        }
      }

      return { emailsSent, totalResults: results.length };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);
