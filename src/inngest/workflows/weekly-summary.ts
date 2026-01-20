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
      console.log('Weekly summary reports generated:', results);
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
