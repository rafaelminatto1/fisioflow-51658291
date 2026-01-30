/**
 * Birthday Messages Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - supabase.from().select().filter('date_of_birth', 'like') → Client-side date filtering
 * - .in('id', ids) → Batch fetch
 *
 * OPTIMIZATION NOTE: Firestore doesn't support LIKE queries on dates.
 * For production with large datasets, consider:
 * 1. Adding a birthday_MMDD field (e.g., "12-25") to each patient document
 * 2. Creating an index on this field
 * 3. Using .where('birthday_MMDD', '==', todayMMDD) for O(1) lookup
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper and optimizations
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, BirthdayMessagePayload, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb } from '../../lib/firebase/admin.js';
import { logger } from '@/lib/errors/logger.js';

// Types for birthday workflow
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

interface Therapist {
  id: string;
  full_name?: string;
  name?: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name?: string;
  settings?: {
    whatsapp_enabled?: boolean;
    email_enabled?: boolean;
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
    const db = getAdminDb();

    // Step 1: Find all patients with birthdays today
    const patients = await step.run('find-birthdays-today', async (): Promise<Patient[]> => {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayMMDD = `${month}-${day}`;

      // Try to use optimized field first (if it exists)
      const optimizedSnapshot = await db.collection('patients')
        .where('active', '==', true)
        .where('birthday_MMDD', '==', todayMMDD)
        .limit(1)
        .get();

      let birthdayPatients: Patient[] = [];

      if (!optimizedSnapshot.empty) {
        // Field exists, use it for all patients
        const fullSnapshot = await db.collection('patients')
          .where('active', '==', true)
          .where('birthday_MMDD', '==', todayMMDD)
          .get();

        birthdayPatients = fullSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        // Fall back to client-side filtering (less efficient)
        logger.warn('[Birthday] birthday_MMDD field not found, using client-side filtering', undefined, 'birthdays-workflow');
        const snapshot = await db.collection('patients')
          .where('active', '==', true)
          .select('id', 'name', 'email', 'phone', 'date_of_birth', 'organization_id', 'settings', 'notification_preferences')
          .get();

        birthdayPatients = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((patient: Patient) => {
            const dob = patient.date_of_birth;
            return dob && dob.includes(`-${todayMMDD}`);
          });
      }

      return birthdayPatients;
    });

    if (patients.length === 0) {
      return {
        success: true,
        messagesSent: 0,
        timestamp: new Date().toISOString(),
        message: 'No birthdays today',
      };
    }

    // Step 2: Get organization settings (batch fetch for efficiency)
    const { patientsWithOrg, therapistMap } = await step.run('get-related-data', async (): Promise<{
      patientsWithOrg: Array<Patient & { organization?: Organization }>;
      therapistMap: Map<string, Therapist>;
    }> => {
      const orgIds = [...new Set(patients.map((p: { organization_id: string }) => p.organization_id))];

      // Batch fetch organizations
      const orgPromises = orgIds.map(orgId => db.collection('organizations').doc(orgId).get());
      const orgSnapshots = await Promise.all(orgPromises);

      const orgMap = new Map<string, Organization>(
        orgSnapshots
          .filter(snap => snap.exists)
          .map(snap => [snap.id, { id: snap.id, ...snap.data() }])
      );

      // OPTIMIZATION: Fetch ALL therapists for these organizations at once
      // instead of querying per patient in the loop
      const therapistsSnapshot = await db.collection('profiles')
        .where('organization_id', 'in', orgIds)
        .where('role', '==', 'therapist')
        .get();

      // Create a map: organizationId -> therapist
      const therapistByOrg = new Map<string, Therapist>();
      therapistsSnapshot.docs.forEach(doc => {
        const therapist = { id: doc.id, ...doc.data() };
        therapistByOrg.set(therapist.organization_id, therapist);
      });

      const patientsWithOrgData = patients.map((patient: Patient) => ({
        ...patient,
        organization: orgMap.get(patient.organization_id),
      }));

      return {
        patientsWithOrg: patientsWithOrgData,
        therapistMap: therapistByOrg,
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

        // Get therapist from the pre-fetched map
        const therapist = therapistMap.get(patient.organization_id);
        const therapistName = therapist?.full_name || therapist?.name || '';

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
