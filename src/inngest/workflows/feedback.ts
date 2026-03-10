/**
 * Feedback Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { 
  getAppointmentById, 
  getPatientById, 
  getOrganizationsByIds 
} from './_shared/neon-patients-appointments';

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

    const completedStatuses = ['concluido', 'realizado', 'attended', 'completed'];
    const isCompleted = completedStatuses.includes(record.status?.toLowerCase());
    const wasCompleted = completedStatuses.includes(old_record?.status?.toLowerCase());

    if (!isCompleted || wasCompleted) {
      return { skipped: true, reason: 'Not a new completion' };
    }

    const appointmentId = record.id;

    // Step 1: Wait 2 hours after the appointment
    await step.sleep('2h');

    // Step 2: Fetch details (Neon)
    const details = await step.run('fetch-details', async () => {
      const appointment = await getAppointmentById(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      const patient = await getPatientById(appointment.patient_id);
      
      const orgMap = appointment.organization_id 
        ? await getOrganizationsByIds([appointment.organization_id])
        : new Map();
      
      const organization = appointment.organization_id ? orgMap.get(appointment.organization_id) : null;

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
