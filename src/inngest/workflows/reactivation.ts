/**
 * Reactivation Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - Complex joins → Client-side data aggregation
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb } from '../../lib/firebase/admin.js';

interface Appointment {
  date: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  organization_id: string;
  notification_preferences?: {
    whatsapp?: boolean;
    email?: boolean;
  };
  organization?: Organization;
}

interface Organization {
  id: string;
  name: string;
  settings?: {
    whatsapp_enabled?: boolean;
    email_enabled?: boolean;
  };
}

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
    const db = getAdminDb();

    // Step 1: Find patients inactive > 30 days
    const patients = await step.run('find-inactive-patients', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get active patients
      const patientsSnapshot = await db.collection('patients')
        .where('active', '==', true)
        .select('id', 'name', 'phone', 'email', 'organization_id', 'notification_preferences')
        .get();

      const inactivePatients: Patient[] = [];
      const now = new Date();

      // OPTIMIZATION: Fetch all completed appointments in one query
      // Then filter by date client-side
      const appointmentsSnapshot = await db.collection('appointments')
        .where('status', 'in', ['concluido', 'realizado', 'attended'])
        .where('date', '>=', new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()) // Last 60 days max
        .get();

      // Create a map: patientId -> latest appointment
      const latestAppointmentByPatient = new Map<string, Appointment>();
      appointmentsSnapshot.docs.forEach(doc => {
        const appt = { id: doc.id, ...doc.data() } as Appointment;
        const existing = latestAppointmentByPatient.get(appt.patient_id || '');
        if (!existing || new Date(appt.date) > new Date(existing.date)) {
          latestAppointmentByPatient.set(appt.patient_id || '', appt);
        }
      });

      for (const patientDoc of patientsSnapshot.docs) {
        const p = { id: patientDoc.id, ...patientDoc.data() } as Patient;

        // Check preferences
        const prefs = p.notification_preferences || {};
        if (prefs.whatsapp === false && prefs.email === false) continue;
        if (!p.phone && !p.email) continue;

        const lastApp = latestAppointmentByPatient.get(p.id);
        if (!lastApp) continue; // No appointments at all

        const lastDate = new Date(lastApp.date);
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // If last appointment was between 30 and 37 days ago
        if (diffDays >= 30 && diffDays <= 37) {
          inactivePatients.push(p);
        }
      }

      return inactivePatients;
    });

    if (patients.length === 0) {
      return { success: true, processed: 0, message: 'No inactive patients found in window' };
    }

    // Step 2: Get Org Settings
    const patientsWithOrg = await step.run('get-org-settings', async () => {
      const orgIds = [...new Set(patients.map((p) => p.organization_id))];

      // Fetch organizations in batch
      const orgPromises = orgIds.map(orgId => db.collection('organizations').doc(orgId).get());
      const orgSnapshots = await Promise.all(orgPromises);

      const orgMap = new Map(
        orgSnapshots
          .filter(snap => snap.exists)
          .map(snap => [snap.id, { id: snap.id, ...snap.data() }])
      );

      return patients.map((p) => ({
        ...p,
        organization: orgMap.get(p.organization_id),
      }));
    });

    // Step 3: Queue Messages
    const results = await step.run('queue-reactivation', async () => {
      const events: any[] = [];

      for (const p of patientsWithOrg) {
        const org = p.organization;
        const notificationPrefs = p.notification_preferences || {};

        const whatsappEnabled = (org?.settings?.whatsapp_enabled ?? true) && (notificationPrefs.whatsapp !== false);
        const emailEnabled = (org?.settings?.email_enabled ?? true) && (notificationPrefs.email !== false);

        if (whatsappEnabled && p.phone) {
          events.push({
            name: 'whatsapp/reactivation',
            data: {
              to: p.phone,
              patientName: p.name,
              organizationName: org?.name || 'FisioFlow'
            }
          });
        }

        if (emailEnabled && p.email) {
          events.push({
            name: 'email/reactivation',
            data: {
              to: p.email,
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
