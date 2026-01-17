/**
 * Birthday Messages Workflow
 *
 * Migrated from /api/crons/birthdays
 * Runs daily at 9:00 AM to send birthday wishes
 *
 * Features:
 * - Throttled to avoid rate limits
 * - Individual retry for failed messages
 * - Sends via WhatsApp and/or Email using integrated services
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, BirthdayMessagePayload, InngestStep } from '../../lib/inngest/types.js';
import { createClient } from '@supabase/supabase-js';

export const birthdayMessagesWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-birthday-messages',
    name: 'Daily Birthday Messages',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    event: Events.CRON_BIRTHDAY_MESSAGES,
    cron: '0 9 * * *', // 9:00 AM daily
  },
  async ({ step }: {
    event: { data: BirthdayMessagePayload }; step: InngestStep
  }) => {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Find all patients with birthdays today
    const patients = await step.run('find-birthdays-today', async (): Promise<any[]> => {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayMMDD = `${month}-${day}`;

      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, phone, date_of_birth, organization_id, settings')
        .eq('active', true)
        .filter('date_of_birth', 'like', `%-${todayMMDD}`);

      if (error) {
        throw new Error(`Failed to fetch birthday patients: ${error.message}`);
      }

      return data || [];
    });

    if (patients.length === 0) {
      return {
        success: true,
        messagesSent: 0,
        timestamp: new Date().toISOString(),
        message: 'No birthdays today',
      };
    }

    // Step 2: Get organization settings for all patients
    const patientsWithOrg = await step.run('get-organization-settings', async (): Promise<any[]> => {
      const orgIds = [...new Set(patients.map((p: { organization_id: string }) => p.organization_id))];

      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name, settings')
        .in('id', orgIds);

      const orgMap = new Map(
        (organizations || []).map((org: { id: string; name?: string; settings?: Record<string, unknown> }) => [org.id, org])
      );

      return patients.map((patient: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        date_of_birth?: string;
        organization_id: string;
        settings?: Record<string, unknown>;
      }) => ({
        ...patient,
        organization: orgMap.get(patient.organization_id),
      }));
    });

    // Step 3: Queue birthday messages via Inngest events
    const results = await step.run('queue-birthday-messages', async (): Promise<{ totalQueued: number; patientsProcessed: number }> => {
      const events: Array<{ name: string; data: Record<string, unknown> }> = [];

      for (const patient of patientsWithOrg) {
        const org = patient.organization;
        const preferredChannel = patient.settings?.notification_channel || 'whatsapp';
        const whatsappEnabled = org?.settings?.whatsapp_enabled ?? true;
        const emailEnabled = org?.settings?.email_enabled ?? true;

        // Get therapist name if available
        const { data: therapist } = await supabase
          .from('users')
          .select('name')
          .eq('organization_id', patient.organization_id)
          .eq('role', 'therapist')
          .limit(1)
          .single();

        const therapistName = therapist?.name || '';

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
