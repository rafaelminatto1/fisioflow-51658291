/**
 * Appointment Workflows - Firebase Cloud Functions
 *
 * Substitui workflows do Inngest:
 * - appointmentReminderWorkflow → Scheduled Function
 * - appointmentCreatedWorkflow → Firestore Trigger
 *
 * @version 1.0.0 - Firebase Functions v2
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { getAdminDb, batchFetchDocuments } from '../init';
import { sendAppointmentReminderEmail, sendAppointmentConfirmationEmail } from '../communications/resend-templates';

// ============================================================================
// TYPES
// ============================================================================

interface AppointmentWithRelations {
  id: string;
  date: string;
  time: string;
  patient_id: string;
  organization_id: string;
  patient: {
    id: string;
    full_name: string;
    name: string;
    email?: string;
    phone?: string;
    notification_preferences?: { email?: boolean; whatsapp?: boolean };
  };
  organization: {
    id: string;
    name?: string;
    settings?: { email_enabled?: boolean; whatsapp_enabled?: boolean };
  };
}

// ============================================================================
// SCHEDULED FUNCTION: Appointment Reminders
// ============================================================================

/**
 * Send Appointment Reminders
 * Runs daily at 08:00 to send reminders for appointments the next day
 *
 * Schedule: "every day 08:00"
 */
export const appointmentReminders = onSchedule(
  {
    schedule: 'every day 08:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
  },
  async (event): Promise<void> => {
    const db = getAdminDb();

    logger.info('[appointmentReminders] Starting appointment reminder check', {
      jobName: 'appointmentReminders',
      scheduleTime: event.scheduleTime,
    });

    try {
      // Get appointments for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const snapshot = await db
        .collection('appointments')
        .where('status', '==', 'agendado')
        .where('date', '>=', tomorrow.toISOString())
        .where('date', '<', dayAfter.toISOString())
        .get();

      if (snapshot.empty) {
        logger.info('[appointmentReminders] No appointments found for tomorrow');
        void {
          success: true,
          remindersSent: 0,
          timestamp: new Date().toISOString(),
        };
        return;
      }

      logger.info('[appointmentReminders] Appointments found', {
        count: snapshot.docs.length,
      });

      // Batch fetch related data
      const patientIds = snapshot.docs.map((doc) => doc.data().patient_id).filter(Boolean);
      const orgIds = snapshot.docs.map((doc) => doc.data().organization_id).filter(Boolean);

      const [patientMap, orgMap] = await Promise.all([
        batchFetchDocuments('patients', patientIds),
        batchFetchDocuments('organizations', orgIds),
      ]);

      // Process each appointment
      let remindersSent = 0;
      const results = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const appointment = { id: docSnap.id, ...docSnap.data() } as any;
          const patient = patientMap.get(appointment.patient_id) || {
            id: appointment.patient_id,
            full_name: 'Unknown',
            name: 'Unknown',
          };
          const organization = orgMap.get(appointment.organization_id) || {
            id: appointment.organization_id,
            name: 'Unknown',
          };

          const preferences = patient.notification_preferences || {};
          const orgSettings = organization?.settings || {};

          try {
            // Check if reminder already sent
            const reminderSnapshot = await db
              .collection('appointment_reminders')
              .where('appointment_id', '==', appointment.id)
              .where('reminder_type', '==', 'day_before')
              .limit(1)
              .get();

            if (!reminderSnapshot.empty) {
              logger.info('[appointmentReminders] Reminder already sent', {
                appointmentId: appointment.id,
              });
              return {
                appointmentId: appointment.id,
                sent: false,
                reason: 'Already sent',
              };
            }

            // Send email reminder
            if (preferences.email !== false && orgSettings.email_enabled && patient.email) {
              const emailResult = await sendAppointmentReminderEmail(patient.email, {
                patientName: patient.full_name || patient.name || 'Paciente',
                date: appointment.date,
                time: appointment.time || appointment.startTime,
                therapistName: appointment.therapistName || 'Seu fisioterapeuta',
                clinicName: organization.name || 'FisioFlow',
              });

              logger.info('[appointmentReminders] Email reminder sent', {
                appointmentId: appointment.id,
                patientEmail: patient.email,
                success: emailResult.success,
                error: emailResult.error,
              });

              if (emailResult.success) {
                remindersSent++;
              }
            }

            // Send WhatsApp reminder
            if (
              preferences.whatsapp !== false &&
              orgSettings.whatsapp_enabled &&
              patient.phone
            ) {
              logger.info('[appointmentReminders] Queuing WhatsApp reminder', {
                appointmentId: appointment.id,
                patientPhone: patient.phone,
              });

              // TODO: Send via WhatsApp provider
              remindersSent++;
            }

            // Log reminder sent
            const reminderRef = db.collection('appointment_reminders').doc();
            await reminderRef.create({
              appointment_id: appointment.id,
              patient_id: patient.id,
              organization_id: organization.id,
              reminder_type: 'day_before',
              sent_at: new Date().toISOString(),
              channels: {
                email: !!(preferences.email !== false && orgSettings.email_enabled && patient.email),
                whatsapp: !!(
                  preferences.whatsapp !== false &&
                  orgSettings.whatsapp_enabled &&
                  patient.phone
                ),
              },
            });

            return {
              appointmentId: appointment.id,
              patientId: patient.id,
              sent: true,
            };
          } catch (error) {
            logger.error('[appointmentReminders] Error processing appointment', {
              appointmentId: appointment.id,
              error,
            });
            return {
              appointmentId: appointment.id,
              sent: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      logger.info('[appointmentReminders] Completed', {
        remindersSent,
        totalAppointments: snapshot.docs.length,
      });

      void {
        success: true,
        remindersSent,
        totalAppointments: snapshot.docs.length,
        timestamp: new Date().toISOString(),
        results,
      };
    } catch (error) {
      logger.error('[appointmentReminders] Fatal error', { error });
      throw error;
    }
  }
);

// ============================================================================
// FIRESTORE TRIGGER: Appointment Created
// ============================================================================

/**
 * Handle Appointment Created
 * Triggered when a new appointment is created in Firestore
 *
 * Actions:
 * - Send confirmation message to patient
 * - Invalidate caches
 */
export const onAppointmentCreatedWorkflow = onDocumentCreated(
  'appointments/{appointmentId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const appointment = { id: snapshot.id, ...snapshot.data() } as any;
    const db = getAdminDb();

    logger.info('[onAppointmentCreatedWorkflow] Processing new appointment', {
      appointmentId: appointment.id,
    });

    try {
      // Fetch related data
      const [patientSnap, orgSnap] = await Promise.all([
        db.collection('patients').doc(appointment.patient_id).get(),
        db.collection('organizations').doc(appointment.organization_id).get(),
      ]);

      if (!patientSnap.exists) {
        logger.warn('[onAppointmentCreatedWorkflow] Patient not found', {
          patientId: appointment.patient_id,
        });
        return;
      }

      const patient = { id: patientSnap.id, ...patientSnap.data() } as any;
      const organization = orgSnap.exists
        ? { id: orgSnap.id, ...orgSnap.data() } as any
        : null;

      // Check preferences
      const whatsappEnabled = organization?.settings?.whatsapp_enabled ?? true;
      const emailEnabled = organization?.settings?.email_enabled ?? true;

      // Send email confirmation
      if (emailEnabled && patient.email) {
        try {
          const emailResult = await sendAppointmentConfirmationEmail(patient.email, {
            patientName: patient.full_name || patient.name || 'Paciente',
            therapistName: appointment.therapistName || 'Seu fisioterapeuta',
            date: appointment.date,
            time: appointment.time || appointment.startTime,
            clinicName: organization?.name || 'FisioFlow',
            clinicAddress: organization?.address,
          });

          logger.info('[onAppointmentCreatedWorkflow] Email confirmation sent', {
            patientEmail: patient.email,
            success: emailResult.success,
            error: emailResult.error,
          });

          // Create confirmation log
          await db.collection('appointment_confirmations').doc().create({
            appointment_id: appointment.id,
            patient_id: patient.id,
            organization_id: organization?.id,
            sent_at: new Date().toISOString(),
            channel: 'email',
            status: emailResult.success ? 'sent' : 'failed',
            email_id: emailResult.id || null,
            error: emailResult.error || null,
          });
        } catch (error) {
          logger.error('[onAppointmentCreatedWorkflow] Failed to send email confirmation', {
            patientEmail: patient.email,
            error,
          });
        }
      }

      if (whatsappEnabled && patient.phone) {
        // TODO: Send WhatsApp confirmation
        logger.info('[onAppointmentCreatedWorkflow] Queuing WhatsApp confirmation', {
          patientPhone: patient.phone,
          appointmentDate: appointment.date,
        });

        // Create confirmation log
        const confirmationRef = db.collection('appointment_confirmations').doc();
        await confirmationRef.create({
          appointment_id: appointment.id,
          patient_id: patient.id,
          organization_id: organization?.id,
          sent_at: new Date().toISOString(),
          channel: 'whatsapp',
        });
      }

      // Invalidate cache (if using KV cache)
      // TODO: Implement cache invalidation

      logger.info('[onAppointmentCreatedWorkflow] Processed successfully', {
        appointmentId: appointment.id,
      });

      return {
        success: true,
        appointmentId: appointment.id,
      };
    } catch (error) {
      logger.error('[onAppointmentCreatedWorkflow] Error', {
        appointmentId: appointment.id,
        error,
      });
      return {
        success: false,
        appointmentId: appointment.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

// ============================================================================
// FIRESTORE TRIGGER: Appointment Updated (for feedback workflow)
// ============================================================================

/**
 * Handle Appointment Updated
 * Triggered when an appointment is updated
 * Used to trigger feedback request when appointment is completed
 */
export const onAppointmentUpdatedWorkflow = onDocumentUpdated(
  'appointments/{appointmentId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    // Check if status changed to completed
    const completedStatuses = ['concluido', 'realizado', 'attended', 'completed'];
    const isCompleted = completedStatuses.includes(after.status?.toLowerCase());
    const wasCompleted = completedStatuses.includes(before.status?.toLowerCase());

    if (!isCompleted || wasCompleted) {
      return;
    }

    const appointmentId = event.params.appointmentId;
    const db = getAdminDb();

    logger.info('[onAppointmentUpdatedWorkflow] Appointment completed, scheduling feedback', {
      appointmentId,
    });

    // Create a "delayed" feedback task
    // In production, use Cloud Tasks with scheduleTime
    const feedbackRef = db.collection('feedback_tasks').doc();
    await feedbackRef.create({
      appointment_id: appointmentId,
      patient_id: after.patient_id,
      organization_id: after.organization_id,
      scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    logger.info('[onAppointmentUpdatedWorkflow] Feedback task created', {
      appointmentId,
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });

    return {
      success: true,
      feedbackScheduled: true,
    };
  }
);

// ============================================================================
// HELPER FUNCTION: Get Appointments with Relations
// ============================================================================

export async function getAppointmentsWithRelations(
  startDate: Date,
  endDate: Date
): Promise<AppointmentWithRelations[]> {
  const db = getAdminDb();

  const snapshot = await db
    .collection('appointments')
    .where('status', '==', 'agendado')
    .where('date', '>=', startDate.toISOString())
    .where('date', '<', endDate.toISOString())
    .get();

  if (snapshot.empty) {
    return [];
  }

  const patientIds = snapshot.docs.map((doc) => doc.data().patient_id).filter(Boolean);
  const orgIds = snapshot.docs.map((doc) => doc.data().organization_id).filter(Boolean);

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
      patient_id: appointment.patient_id,
      organization_id: appointment.organization_id,
      patient:
        patientMap.get(appointment.patient_id) || {
          id: appointment.patient_id,
          full_name: 'Unknown',
          name: 'Unknown',
        },
      organization:
        orgMap.get(appointment.organization_id) || {
          id: appointment.organization_id,
          name: 'Unknown',
        },
    });
  }

  return appointments;
}
