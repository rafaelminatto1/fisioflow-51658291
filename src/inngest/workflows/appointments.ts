/**
 * Appointment Reminder Workflow
 *
 * Sends reminders for upcoming appointments
 * Can be triggered manually or scheduled
 */

import { inngest, retryConfig } from '@/lib/inngest/client';
import { Events } from '@/lib/inngest/types';
import { createClient } from '@supabase/supabase-js';

export const appointmentReminderWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-appointment-reminder',
    name: 'Send Appointment Reminders',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.APPOINTMENT_REMINDER,
  },
  async ({ event, step }: { event: { data: any }; step: any }) => {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get appointments that need reminders
    const appointments = await step.run('get-appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name, email, phone, notification_preferences),
          organization:organizations(id, name, settings)
        `)
        .eq('status', 'scheduled')
        .gte('date', tomorrow.toISOString())
        .lt('date', dayAfter.toISOString());

      if (error) {
        throw new Error(`Failed to fetch appointments: ${error.message}`);
      }

      return data || [];
    });

    if (appointments.length === 0) {
      return {
        success: true,
        remindersSent: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Send reminders
    const results = await step.run('send-reminders', async () => {
      return await Promise.all(
        appointments.map(async (appointment: any) => {
          const patient = appointment.patient;
          const preferences = patient.notification_preferences || {};
          const orgSettings = appointment.organization?.settings || {};

          const reminderEvents: any[] = [];

          // Email reminder
          if (preferences.email !== false && orgSettings.email_enabled && patient.email) {
            reminderEvents.push({
              name: Events.EMAIL_SEND,
              data: {
                to: patient.email,
                subject: 'Lembrete de Consulta - FisioFlow',
                html: `
                  <h2>Olá, ${patient.name}!</h2>
                  <p>Gostaríamos de lembrá-lo da sua consulta agendada para amanhã.</p>
                  <p><strong>Data:</strong> ${new Date(appointment.date).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Horário:</strong> ${appointment.time}</p>
                  <p>Até amanhã!</p>
                `,
              },
            });
          }

          // WhatsApp reminder
          if (preferences.whatsapp !== false && orgSettings.whatsapp_enabled && patient.phone) {
            reminderEvents.push({
              name: Events.WHATSAPP_SEND,
              data: {
                to: patient.phone,
                message: `Olá ${patient.name}! Este é um lembrete da sua consulta amanhã às ${appointment.time}. Até lá!`,
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

    const totalQueued = results.reduce((sum: number, r: any) => sum + (r.notificationsQueued || 0), 0);

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
  async ({ event, step }: { event: { data: any }; step: any }) => {
    const { appointmentId, patientId, organizationId } = event.data;

    // Invalidate cache for patient
    await step.run('invalidate-cache', async () => {
      // Invalidate appointment cache
      // TODO: Use KVCacheService
      return { invalidated: true };
    });

    // Optionally send confirmation
    await step.run('send-confirmation', async () => {
      // TODO: Send confirmation message
      return { queued: true };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  }
);
