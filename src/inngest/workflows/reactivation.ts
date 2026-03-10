/**
 * Reactivation Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { InngestStep } from '../../lib/inngest/types.js';
import {
  getActivePatients,
  getLatestCompletedAppointmentByPatient,
  getOrganizationsByIds
} from './_shared/neon-patients-appointments';

export const reactivationWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-reactivation-weekly',
    name: 'Weekly Reactivation Campaign',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    cron: '0 10 * * 1', // 10:00 AM on Mondays
  },
  async ({ step }: { step: InngestStep }) => {
    // Step 1: Find patients inactive > 30 days (Neon)
    const inactivePatients = await step.run('find-inactive-patients', async () => {
      const activePatients = await getActivePatients();
      const patientsToReactivate = [];
      const now = new Date();

      const latestAppointmentByPatient = await getLatestCompletedAppointmentByPatient(60);

      for (const row of activePatients) {
        const lastApp = latestAppointmentByPatient.get(row.id);
        if (!lastApp) continue;

        const lastDate = new Date(lastApp.date);
        const diffDays = Math.ceil(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 30 && diffDays <= 37) {
          patientsToReactivate.push({
            id: row.id,
            name: row.full_name,
            phone: row.phone,
            organization_id: row.organization_id
          });
        }
      }
      return patientsToReactivate;
    });

    if (inactivePatients.length === 0) {
      return { success: true, processed: 0 };
    }

    // Step 2: Get Org Settings (Neon)
    const patientsWithOrg = await step.run('get-org-settings', async () => {
      const orgIds = [...new Set(inactivePatients.map((p) => p.organization_id))].filter(Boolean) as string[];
      const orgMap = await getOrganizationsByIds(orgIds);

      return inactivePatients.map((p) => ({
        ...p,
        organization: orgIds.length > 0 ? orgMap.get(p.organization_id || '') : null,
      }));
    });

    // Step 3: Queue Messages
    const results = await step.run('queue-reactivation', async () => {
      const events = [];

      for (const p of patientsWithOrg) {
        const org = p.organization;
        if (org?.settings?.whatsapp_enabled !== false && p.phone) {
          events.push({
            name: 'whatsapp/reactivation',
            data: {
              to: p.phone,
              patientName: p.name,
              organizationName: org?.name || 'FisioFlow'
            }
          });
        }
      }

      if (events.length > 0) {
        await inngest.send(events);
      }

      return { queued: events.length };
    });

    return {
      success: true,
      queued: results.queued,
      timestamp: new Date().toISOString()
    };
  }
);
