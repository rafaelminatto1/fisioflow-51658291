/**
 * Feedback Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - Nested selects → Optimized batch fetch
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb } from '../../lib/firebase/admin.js';

interface AppointmentRecord {
  id: string;
  status: string;
  patient_id?: string;
  organization_id?: string;
}

interface AppointmentUpdatedEvent {
  data: {
    old_record?: Partial<AppointmentRecord>;
    record: AppointmentRecord;
  };
}

export const appointmentCompletedWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-feedback-request',
    name: 'Request Feedback after Appointment',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  { event: Events.APPOINTMENT_UPDATED },
  async ({ event, step }: { event: AppointmentUpdatedEvent; step: InngestStep }) => {
    const { old_record, record } = event.data;

    // Only trigger if status changed to 'concluido' (or 'completed', 'attended')
    const completedStatuses = ['concluido', 'realizado', 'attended', 'completed'];
    const isCompleted = completedStatuses.includes(record.status?.toLowerCase());
    const wasCompleted = completedStatuses.includes(old_record?.status?.toLowerCase());

    if (!isCompleted || wasCompleted) {
      return { skipped: true, reason: 'Not a new completion' };
    }

    const appointmentId = record.id;

    // Step 1: Wait 2 hours after the appointment
    await step.sleep('2h');

    const db = getAdminDb();

    // Step 2: Fetch details
    const details = await step.run('fetch-details', async () => {
      const appointmentSnap = await db.collection('appointments').doc(appointmentId).get();

      if (!appointmentSnap.exists) {
        throw new Error('Appointment not found');
      }

      const appointment = { id: appointmentSnap.id, ...appointmentSnap.data() } as { id: string; patient_id: string; organization_id: string; status: string };

      // Fetch patient
      const patientSnap = await db.collection('patients').doc(appointment.patient_id).get();
      const patient = patientSnap.exists ? { id: patientSnap.id, ...patientSnap.data() } : null;

      // Fetch organization
      const orgSnap = await db.collection('organizations').doc(appointment.organization_id).get();
      const organization = orgSnap.exists ? { id: orgSnap.id, ...orgSnap.data() } : null;

      return {
        ...appointment,
        patient,
        organization,
      };
    });

    if (!details || details.status !== record.status) {
      return { skipped: true, reason: 'Status changed or not found' };
    }

    // Step 3: Check preferences and send
    const patient = details.patient;
    const org = details.organization;

    if (!patient?.phone) return { skipped: true, reason: 'No phone' };
    if (patient.notification_preferences?.whatsapp === false) return { skipped: true, reason: 'Opt-out' };
    if (org?.settings?.whatsapp_enabled === false) return { skipped: true, reason: 'Org disabled WA' };

    await step.run('send-feedback-request', async () => {
      await inngest.send({
        name: 'whatsapp/send',
        data: {
          to: patient.phone,
          type: 'template',
          templateName: 'feedback_request',
          language: 'pt_BR',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patient.name.split(' ')[0] },
                { type: 'text', text: org?.name || 'FisioFlow' }
              ]
            }
          ]
        }
      });
    });

    return { success: true, processed: true };
  }
);
