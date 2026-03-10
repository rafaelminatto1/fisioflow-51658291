/**
 * Appointment Reminder Workflow - Migrated to Neon/Cloudflare
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import {
  getAppointmentById,
  getAppointmentsForReminder,
  getPatientsByIds,
  getOrganizationsByIds,
  getProfilesByIds,
} from './_shared/neon-patients-appointments';

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
  therapist?: {
    id: string;
    full_name: string;
  };
};

async function getAppointmentsWithRelations(startDate: Date, endDate: Date): Promise<AppointmentWithRelations[]> {
  const appointmentsFromNeon = await getAppointmentsForReminder(startDate, endDate);
  if (!appointmentsFromNeon.length) {
    return [];
  }

  // Buscar dados relacionados em lote no Neon
  const patientIds = appointmentsFromNeon.map((a) => a.patient_id).filter(Boolean);
  const orgIds = appointmentsFromNeon.map((a) => a.organization_id).filter(Boolean);
  const therapistIds = appointmentsFromNeon.map((a) => a.therapist_id).filter(Boolean);

  const [patientMap, orgMap, therapistMap] = await Promise.all([
    getPatientsByIds(patientIds),
    getOrganizationsByIds(orgIds),
    getProfilesByIds(therapistIds),
  ]);

  const appointments: AppointmentWithRelations[] = [];

  for (const appointment of appointmentsFromNeon) {
    const patient = patientMap.get(appointment.patient_id);
    const org = appointment.organization_id ? orgMap.get(appointment.organization_id) : null;
    const therapist = appointment.therapist_id ? therapistMap.get(appointment.therapist_id) : undefined;

    appointments.push({
      id: appointment.id,
      date: appointment.date,
      time: appointment.start_time ?? '08:00:00',
      patient: {
        id: appointment.patient_id,
        full_name: patient?.full_name || 'Unknown',
        email: patient?.email,
        phone: patient?.phone,
      },
      organization: {
        id: appointment.organization_id || 'unknown',
        name: org?.name || 'Unknown',
        settings: org?.settings,
      },
      therapist: appointment.therapist_id
        ? {
          id: appointment.therapist_id,
          full_name: therapist?.full_name || therapist?.name || 'Fisioterapeuta',
        }
        : undefined,
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
                therapistName: appointment.therapist?.full_name || 'Fisioterapeuta',
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
    const { appointmentId } = event.data;

    // 1. Fetch complete appointment details
    const appointment = await step.run('get-appointment-details', async () => {
      const appointmentData = await getAppointmentById(appointmentId);
      if (!appointmentData) {
        throw new Error('Appointment not found');
      }

      // Buscar relações em lote no Neon
      const [patientMap, orgMap, therapistMap] = await Promise.all([
        getPatientsByIds([appointmentData.patient_id]),
        appointmentData.organization_id ? getOrganizationsByIds([appointmentData.organization_id]) : Promise.resolve(new Map()),
        appointmentData.therapist_id ? getProfilesByIds([appointmentData.therapist_id]) : Promise.resolve(new Map()),
      ]);

      const patient = patientMap.get(appointmentData.patient_id) || null;
      const organization = appointmentData.organization_id ? orgMap.get(appointmentData.organization_id) : null;
      const therapist = appointmentData.therapist_id ? therapistMap.get(appointmentData.therapist_id) : null;

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
        const dateTime = new Date(`${appointment.date}T${appointment.start_time ?? '08:00:00'}`);
        await inngest.send({
          name: 'whatsapp/appointment.confirmation',
          data: {
            to: patient.phone,
            patientName: patient.full_name,
            therapistName: therapist?.full_name || 'Fisioterapeuta',
            date: dateTime.toLocaleDateString('pt-BR'),
            time: dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
