/**
 * Data Integrity Workflow
 *
 * Migrated from /api/crons/data-integrity
 * Runs periodically to check for orphaned records and data consistency
 */

import { inngest, retryConfig } from '@/lib/inngest/client';
import { Events } from '@/lib/inngest/types';
import { createClient } from '@supabase/supabase-js';

export const dataIntegrityWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-data-integrity',
    name: 'Data Integrity Check',
    retries: retryConfig.database.maxAttempts,
  },
  {
    event: Events.CRON_DATA_INTEGRITY,
    cron: '0 */6 * * *', // Every 6 hours
  },
  async ({ step }: { event: { data: Record<string, unknown> }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const issues: string[] = [];

    // Check 1: Appointments without valid patients
    await step.run('check-orphaned-appointments', async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .not('patient_id', 'in', '(select id from patients where active = true)');

      if (error) {
        console.error('Failed to check orphaned appointments:', error);
      } else if (data && data.length > 0) {
        issues.push(`Found ${data.length} appointments with invalid patients`);
      }

      return data?.length || 0;
    });

    // Check 2: Sessions without valid appointments
    await step.run('check-orphaned-sessions', async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .not('appointment_id', 'in', '(select id from appointments)');

      if (error) {
        console.error('Failed to check orphaned sessions:', error);
      } else if (data && data.length > 0) {
        issues.push(`Found ${data.length} sessions with invalid appointments`);
      }

      return data?.length || 0;
    });

    // Check 3: Payments without valid appointments
    await step.run('check-orphaned-payments', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .not('appointment_id', 'in', '(select id from appointments)');

      if (error) {
        console.error('Failed to check orphaned payments:', error);
      } else if (data && data.length > 0) {
        issues.push(`Found ${data.length} payments with invalid appointments`);
      }

      return data?.length || 0;
    });

    // Check 4: Patients with invalid organizations
    await step.run('check-orphaned-patients', async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id')
        .not('organization_id', 'in', '(select id from organizations)');

      if (error) {
        console.error('Failed to check orphaned patients:', error);
      } else if (data && data.length > 0) {
        issues.push(`Found ${data.length} patients with invalid organizations`);
      }

      return data?.length || 0;
    });

    // Log results
    await step.run('log-integrity-results', async () => {
      if (issues.length > 0) {
        console.warn('Data integrity issues found:', issues);
        // TODO: Send alert to admins
      } else {
        console.log('Data integrity check passed: No issues found');
      }

      return {
        issues,
        timestamp: new Date().toISOString(),
      };
    });

    return {
      success: true,
      issuesFound: issues.length,
      issues,
      timestamp: new Date().toISOString(),
    };
  }
);
