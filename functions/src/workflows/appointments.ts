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
import { logger } from '../lib/logger';
import { getAdminDb, batchFetchDocuments } from '../init';
import { sendAppointmentConfirmationEmail } from '../communications/resend-templates';
import { dispatchAppointmentNotification } from './notifications';

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

function resolveAppointmentDateTime(appointment: any): Date | null {
  const rawDate = appointment.date || appointment.appointment_date;
  const rawTime = appointment.time || appointment.start_time || appointment.startTime || appointment.appointment_time;
  if (!rawDate || !rawTime) return null;

  let baseDate: Date | null = null;
  if (rawDate instanceof Date) {
    baseDate = rawDate;
  } else if (typeof rawDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [year, month, day] = rawDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day, 0, 0, 0);
    } else {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
  } else if (rawDate && typeof rawDate.toDate === 'function') {
    baseDate = rawDate.toDate();
  }

  if (!baseDate || Number.isNaN(baseDate.getTime())) return null;

  const [hoursStr, minutesStr] = String(rawTime).split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const appointmentDateTime = new Date(baseDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  return Number.isNaN(appointmentDateTime.getTime()) ? null : appointmentDateTime;
}

// ============================================================================
// SCHEDULED FUNCTION: Appointment Reminders
// ============================================================================

/**
 * Send Appointment Reminders
 * Runs daily at 08:00 to send reminders for appointments of next day
 *
 * Schedule: "every day 08:00"
 */
export const appointmentReminders = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
  },
  async (event) => {
    const db = getAdminDb();

    logger.info('[appointmentReminders] Starting appointment reminder check', {
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
      await Promise.all(
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
          const emailEnabledByOrg = orgSettings.email_enabled !== false;
          const whatsappEnabledByOrg = orgSettings.whatsapp_enabled !== false;
          const emailEnabledByPatient = preferences.email !== false;
          const whatsappEnabledByPatient = preferences.whatsapp !== false;

          try {
            // Check if reminder already sent
            const reminderSnapshot = await db
              .collection('appointment_reminders')
              .where('appointment_id', '==', appointment.id)
              .where('reminder_type', '==', 'day_before')
              .limit(1)
              .get();

            if (!reminderSnapshot.empty) {
              return;
            }

            if ((!emailEnabledByOrg && !whatsappEnabledByOrg) || (!emailEnabledByPatient && !whatsappEnabledByPatient)) {
              return;
            }

            const dispatchResult = await dispatchAppointmentNotification({
              kind: 'reminder_24h',
              organizationId: organization.id,
              appointmentId: appointment.id,
              patientId: patient.id,
              date: appointment.date,
              time: appointment.time || appointment.startTime,
              patientName: patient.full_name || patient.name || 'Paciente',
              therapistName: appointment.therapistName || 'Seu fisioterapeuta',
            });

            const emailSent = emailEnabledByOrg && emailEnabledByPatient && !!dispatchResult.email.sent;
            const whatsappSent = whatsappEnabledByOrg && whatsappEnabledByPatient && !!dispatchResult.whatsapp.sent;
            const pushSent = !!dispatchResult.push.sent;
            const anySent = emailSent || whatsappSent || pushSent;

            if (anySent) remindersSent++;

            // Log reminder sent
            const reminderRef = db.collection('appointment_reminders').doc();
            await reminderRef.create({
              appointment_id: appointment.id,
              patient_id: patient.id,
              organization_id: organization.id,
              reminder_type: 'day_before',
              sent_at: new Date().toISOString(),
              channels: {
                email: emailSent,
                whatsapp: whatsappSent,
                push: pushSent,
              },
              errors: {
                email: dispatchResult.email.error || null,
                whatsapp: dispatchResult.whatsapp.error || null,
                push: dispatchResult.push.error || null,
              },
            });
          } catch (error) {
            logger.error('[appointmentReminders] Error processing appointment', {
              appointmentId: appointment.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );

      logger.info('[appointmentReminders] Completed', {
        remindersSent,
        totalAppointments: snapshot.docs.length,
      });
    } catch (error) {
      logger.error('[appointmentReminders] Fatal error', { error });
    }
  }
);

/**
 * Send 2-hour reminders.
 * Runs every 30 minutes and targets appointments between 90 and 150 minutes from now.
 */
export const appointmentReminders2h = onSchedule(
  {
    schedule: '*/30 * * * *',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
  },
  async () => {
    const db = getAdminDb();
    const now = new Date();
    let snapshot;

    try {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 2);

      snapshot = await db
        .collection('appointments')
        .where('status', '==', 'agendado')
        .where('date', '>=', start.toISOString())
        .where('date', '<', end.toISOString())
        .get();
    } catch {
      snapshot = await db.collection('appointments').where('status', '==', 'agendado').get();
    }

    if (snapshot.empty) {
      return;
    }

    const candidates = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any))
      .filter((appointment) => {
        const appointmentDateTime = resolveAppointmentDateTime(appointment);
        if (!appointmentDateTime) return false;
        const diffMinutes = (appointmentDateTime.getTime() - now.getTime()) / 60000;
        return diffMinutes >= 90 && diffMinutes <= 150;
      });

    if (candidates.length === 0) {
      return;
    }

    // Batch fetch patients and orgs for candidates
    const patientIds = candidates.map(c => c.patient_id).filter(Boolean);
    const orgIds = candidates.map(c => c.organization_id).filter(Boolean);
    const [patientMap] = await Promise.all([
      batchFetchDocuments('patients', patientIds),
      batchFetchDocuments('organizations', orgIds),
    ]);

    await Promise.all(candidates.map(async (appointment) => {
      const reminderSnapshot = await db
        .collection('appointment_reminders')
        .where('appointment_id', '==', appointment.id)
        .where('reminder_type', '==', 'two_hours')
        .limit(1)
        .get();

      if (!reminderSnapshot.empty) {
        return;
      }

      const patient = patientMap.get(appointment.patient_id) || {};

      const dispatch = await dispatchAppointmentNotification({
        kind: 'reminder_2h',
        organizationId: String(appointment.organization_id || 'system'),
        appointmentId: String(appointment.id),
        patientId: String(appointment.patient_id),
        date: String(appointment.date || appointment.appointment_date || ''),
        time: String(appointment.time || appointment.start_time || appointment.startTime || appointment.appointment_time || ''),
        patientName: patient.full_name || patient.name || 'Paciente',
        therapistName: appointment.therapistName || 'Seu fisioterapeuta',
      });

      await db.collection('appointment_reminders').doc().create({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        organization_id: appointment.organization_id,
        reminder_type: 'two_hours',
        sent_at: new Date().toISOString(),
        channels: {
          email: dispatch.email.sent,
          whatsapp: dispatch.whatsapp.sent,
        },
        errors: {
          email: dispatch.email.error || null,
          whatsapp: dispatch.whatsapp.error || null,
        },
      });
    }));
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

    if (appointment.notification_origin === 'api_appointments_v2') {
      logger.info('[onAppointmentCreatedWorkflow] Notification skipped (handled by API flow)', {
        appointmentId: appointment.id,
      });
      return;
    }

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
            error: error instanceof Error ? error.message : 'Unknown error',
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

      logger.info('[onAppointmentCreatedWorkflow] Processed successfully', {
        appointmentId: appointment.id,
      });
    } catch (error) {
      logger.error('[onAppointmentCreatedWorkflow] Error', {
        appointmentId: appointment.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
