/**
 * Appointment Reminder Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - supabase.from() → firestore queries
 * - select() → getDoc/getDocs
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb, batchFetchDocuments } from '../../lib/firebase/admin.js';

type AppointmentWithRelations = {
  id: string;
  date: string;
  time: string;
  patient: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    notification_preferences?: { email?: boolean; whatsapp?: boolean };
  };
  organization: {
    id: string;
    name?: string;
    settings?: { email_enabled?: boolean; whatsapp_enabled?: boolean };
  };
};

/**
 * Helper para buscar appointments com relações no Firestore
 */
async function getAppointmentsWithRelations(startDate: Date, endDate: Date): Promise<AppointmentWithRelations[]> {
  const db = getAdminDb();

  const snapshot = await db.collection('appointments')
    .where('status', '==', 'agendado')
    .where('date', '>=', startDate.toISOString())
    .where('date', '<', endDate.toISOString())
    .get();

  if (snapshot.empty) {
    return [];
  }

  // Buscar dados relacionados em lote
  const patientIds = snapshot.docs.map(doc => doc.data().patient_id).filter(Boolean);
  const orgIds = snapshot.docs.map(doc => doc.data().organization_id).filter(Boolean);

  const [patientMap, orgMap] = await Promise.all([
    batchFetchDocuments('patients', patientIds),
    batchFetchDocuments('organizations', orgIds),
  ]);

  const appointments: AppointmentWithRelations[] = [];

  for (const docSnap of snapshot.docs) {
    const appointment = { id: docSnap.id, ...docSnap.data() } as any;

    appointments.push({
      id: appointment.id,
      date: appointment.date,
      time: appointment.time,
      patient: patientMap.get(appointment.patient_id) || { id: appointment.patient_id, full_name: 'Unknown' },
      organization: orgMap.get(appointment.organization_id) || { id: appointment.organization_id, name: 'Unknown' },
    });
  }

  return appointments;
}

export const appointmentReminderWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-appointment-reminder',
    name: 'Send Appointment Reminders',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.APPOINTMENT_REMINDER,
  },
  async ({ step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    // Get appointments that need reminders
    const appointments = await step.run('get-appointments', async (): Promise<AppointmentWithRelations[]> => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      return await getAppointmentsWithRelations(tomorrow, dayAfter);
    });

    if (appointments.length === 0) {
      return {
        success: true,
        remindersSent: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Send reminders
    const results = await step.run('send-reminders', async (): Promise<{ appointmentId: string; patientId: string; notificationsQueued: number }[]> => {
      return await Promise.all(
        appointments.map(async (appointment: AppointmentWithRelations) => {
          const patient = appointment.patient;
          const preferences = patient.notification_preferences || {};
          const orgSettings = appointment.organization?.settings || {};

          const reminderEvents: Array<{ name: string; data: Record<string, unknown> }> = [];

          // Email reminder
          if (preferences.email !== false && orgSettings.email_enabled && patient.email) {
            reminderEvents.push({
              name: Events.EMAIL_SEND,
              data: {
                to: patient.email,
                subject: 'Lembrete de Consulta - FisioFlow',
                html: `
                  <h2>Olá, ${patient.full_name}!</h2>
                  <p>Gostaríamos de lembrá-lo da sua consulta agendada para amanhã.</p>
                  <p><strong>Data:</strong> ${new Date(appointment.date).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Horário:</strong> ${appointment.time}</p>
                  <p>Até amanhã!</p>
                `,
              },
            });
          }

          // WhatsApp reminder (Using structured event)
          if (preferences.whatsapp !== false && orgSettings.whatsapp_enabled && patient.phone) {
            reminderEvents.push({
              name: 'whatsapp/appointment.reminder',
              data: {
                to: patient.phone,
                patientName: patient.full_name,
                therapistName: 'Fisioterapeuta', // TODO: Fetch therapist name if possible, or generic
                date: new Date(appointment.date).toLocaleDateString('pt-BR'),
                time: appointment.time,
                organizationName: appointment.organization?.name || 'FisioFlow',
                location: 'Clínica' // Optional
              },
            });
          }

          if (reminderEvents.length > 0) {
            await inngest.send(reminderEvents);
          }

          return {
            appointmentId: appointment.id,
            patientId: patient.id,
            notificationsQueued: reminderEvents.length,
          };
        })
      );
    });

    const totalQueued = results.reduce((sum: number, r: { notificationsQueued?: number }) => sum + (r.notificationsQueued || 0), 0);

    return {
      success: true,
      remindersSent: totalQueued,
      appointmentsProcessed: appointments.length,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);

/**
 * Create appointment workflow (triggered when appointment is created)
 */
export const appointmentCreatedWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-appointment-created',
    name: 'Handle Appointment Created',
    retries: 2,
  },
  {
    event: Events.APPOINTMENT_CREATED,
  },
  async ({ event, step }: { event: { data: { appointmentId: string } }; step: InngestStep }) => {
    const db = getAdminDb();
    const { appointmentId } = event.data;

    // 1. Fetch complete appointment details
    const appointment = await step.run('get-appointment-details', async () => {
      const appointmentSnap = await db.collection('appointments').doc(appointmentId).get();

      if (!appointmentSnap.exists) {
        throw new Error('Appointment not found');
      }

      const appointmentData = { id: appointmentSnap.id, ...appointmentSnap.data() } as any;

      // Buscar relações em lote
      const [patientSnap, orgSnap, therapistSnap] = await Promise.all([
        db.collection('patients').doc(appointmentData.patient_id).get(),
        db.collection('organizations').doc(appointmentData.organization_id).get(),
        appointmentData.therapist_id ? db.collection('profiles').doc(appointmentData.therapist_id).get() : Promise.resolve({ exists: false }),
      ]);

      const patient = patientSnap.exists ? { id: patientSnap.id, ...patientSnap.data() } : null;
      const organization = orgSnap.exists ? { id: orgSnap.id, ...orgSnap.data() } : null;
      const therapist = therapistSnap.exists ? { id: therapistSnap.id, ...therapistSnap.data() } : null;

      return {
        ...appointmentData,
        patient,
        organization,
        therapist,
      };
    });

    if (!appointment) return { success: false, reason: 'Appointment not found' };

    // Invalidate cache for patient
    await step.run('invalidate-cache', async () => {
      // Invalidate appointment cache (kv-cache logic would go here)
      return { invalidated: true };
    });

    // Send confirmation message
    await step.run('send-confirmation', async () => {
      const patient = appointment.patient;
      const org = appointment.organization;
      const therapist = appointment.therapist;

      // Check preferences
      const whatsappEnabled = org?.settings?.whatsapp_enabled ?? true;

      if (whatsappEnabled && patient?.phone) {
        await inngest.send({
          name: 'whatsapp/appointment.confirmation',
          data: {
            to: patient.phone,
            patientName: patient.full_name,
            therapistName: therapist?.full_name || 'Fisioterapeuta',
            date: new Date(appointment.start_time).toLocaleDateString('pt-BR'),
            time: new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            organizationName: org?.name || 'FisioFlow',
            location: 'Consultório'
          }
        });
        return { sent: true, channel: 'whatsapp' };
      }
      return { sent: false, reason: 'Disabled or no phone' };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      appointmentId
    };
  }
);
