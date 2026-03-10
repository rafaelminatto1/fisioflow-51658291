/**
 * Birthday Messages Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, BirthdayMessagePayload, InngestStep } from '../../lib/inngest/types.js';
import {
  getPatientsByBirthdayMMDD,
  getOrganizationsByIds,
  getProfilesByIds,
  type NeonOrganization,
  type NeonProfile
} from './_shared/neon-patients-appointments';

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  organization_id: string;
  settings?: {
    notification_channel?: string;
  };
  notification_preferences?: {
    preferred_channel?: string;
    whatsapp?: boolean;
    email?: boolean;
  };
}

export const birthdayMessagesWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-birthday-messages',
    name: 'Daily Birthday Messages',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  [
    { event: Events.CRON_BIRTHDAY_MESSAGES },
    { cron: '0 9 * * *' }, // 9:00 AM daily
  ],
  async ({ step }: {
    event: { data: BirthdayMessagePayload }; step: InngestStep
  }) => {
    // Step 1: Find all patients with birthdays today
    const patients = await step.run('find-birthdays-today', async (): Promise<Patient[]> => {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayMMDD = `${month}-${day}`;
      const rows = await getPatientsByBirthdayMMDD(todayMMDD);
      return rows.map((row) => ({
        id: row.id,
        name: row.full_name,
        email: row.email,
        phone: row.phone,
        date_of_birth: row.birth_date,
        organization_id: row.organization_id || '',
        notification_preferences: {},
      }));
    });

    if (patients.length === 0) {
      return {
        success: true,
        messagesSent: 0,
        timestamp: new Date().toISOString(),
        message: 'No birthdays today',
      };
    }

    // Step 2: Get organization settings and therapists (Neon)
    const { patientsWithOrg, therapistMap } = await step.run('get-related-data', async (): Promise<{
      patientsWithOrg: Array<Patient & { organization?: NeonOrganization }>;
      therapistMap: Map<string, NeonProfile>;
    }> => {
      const orgIds = [...new Set(patients.map((p: { organization_id: string }) => p.organization_id))];

      // Fetch organizations and all therapists for these orgs
      const [orgMap, profilesMap] = await Promise.all([
        getOrganizationsByIds(orgIds),
        getProfilesByIds([]) // Placeholder
      ]);

      const patientsWithOrgData = patients.map((patient: Patient) => ({
        ...patient,
        organization: orgMap.get(patient.organization_id),
      }));

      return {
        patientsWithOrg: patientsWithOrgData,
        therapistMap: profilesMap,
      };
    });

    // Step 3: Queue birthday messages via Inngest events
    const results = await step.run('queue-birthday-messages', async (): Promise<{ totalQueued: number; patientsProcessed: number }> => {
      const events: Array<{ name: string; data: Record<string, unknown> }> = [];

      for (const patient of patientsWithOrg) {
        const org = patient.organization;
        const preferredChannel = patient.settings?.notification_channel || patient.notification_preferences?.preferred_channel || 'whatsapp';
        const notifPrefs = patient.notification_preferences || {};
        const whatsappEnabled = (org?.settings?.whatsapp_enabled ?? true) && notifPrefs.whatsapp !== false;
        const emailEnabled = (org?.settings?.email_enabled ?? true) && notifPrefs.email !== false;

        // Get therapist from the pre-fetched map (simplified for now)
        const therapist = Array.from(therapistMap.values()).find(p => p.role === 'therapist' || p.role === 'admin');
        const therapistName = therapist?.full_name || therapist?.name || 'Seu Fisioterapeuta';

        // Send WhatsApp message if enabled
        if (whatsappEnabled && preferredChannel === 'whatsapp' && patient.phone) {
          events.push({
            name: 'whatsapp/birthday.greeting',
            data: {
              to: patient.phone,
              patientName: patient.name,
              organizationName: org?.name || 'FisioFlow',
              therapistName,
            },
          });
        }

        // Send email if enabled
        if (emailEnabled && patient.email) {
          events.push({
            name: 'email/birthday.greeting',
            data: {
              to: patient.email,
              patientName: patient.name,
              organizationName: org?.name || 'FisioFlow',
              therapistName,
            },
          });
        }
      }

      // Send all events to Inngest
      if (events.length > 0) {
        await inngest.send(events);
      }

      return {
        totalQueued: events.length,
        patientsProcessed: patientsWithOrg.length,
      };
    });

    return {
      success: true,
      messagesQueued: results.totalQueued,
      totalPatients: results.patientsProcessed,
      timestamp: new Date().toISOString(),
    };
  }
);
