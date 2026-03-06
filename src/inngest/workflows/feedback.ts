/**
 * Feedback Workflow - Migrated to Firebase
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb } from '../../lib/firebase/admin.js';
import { getAppointmentById, getPatientById } from './_shared/neon-patients-appointments';

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
      const appointment = await getAppointmentById(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      const patient = await getPatientById(appointment.patient_id);

      // Fetch organization
      const organization = appointment.organization_id
        ? await db.collection('organizations').doc(appointment.organization_id).get().then((snap) => (snap.exists ? { id: snap.id, ...snap.data() } : null))
        : null;

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
    if ((patient as { notification_preferences?: { whatsapp?: boolean } })?.notification_preferences?.whatsapp === false) {
      return { skipped: true, reason: 'Opt-out' };
    }
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
                { type: 'text', text: (patient.full_name || 'Paciente').split(' ')[0] },
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
