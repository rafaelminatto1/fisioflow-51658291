/**
 * Notification Workflows - Firebase Cloud Functions
 *
 * Substitui workflows do Inngest:
 * - sendNotificationWorkflow → Callable Function + Pub/Sub
 * - sendNotificationBatchWorkflow → Callable Function
 * - Integrado com Firebase Cloud Messaging para push
 *
 * @version 2.0.0 - Fixed Firestore API usage
 */

import * as functions from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { logger } from '../lib/logger';
import { getAdminDb, getAdminMessaging } from '../init';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail, sendEmail } from '../communications/resend-templates';
import {
  formatPhoneForWhatsApp,
  sendWhatsAppTemplateMessageInternal,
  sendWhatsAppTextMessageInternal,
} from '../communications/whatsapp';
import { sendPushNotificationToUser } from '../integrations/notifications/push-notifications';

const CORS_ORIGINS = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /moocafisio\.com\.br$/,
  /fisioflow\.web\.app$/,
];

// ============================================================================
// TYPES
// ============================================================================

interface SendNotificationData {
  userId: string;
  organizationId: string;
  type: 'email' | 'whatsapp' | 'push' | 'all';
  data: {
    to: string;
    subject?: string;
    body: string;
    [key: string]: any;
  };
}

export interface DispatchAppointmentNotificationParams {
  kind: 'reminder_24h' | 'reminder_2h' | 'confirmation' | 'cancellation' | 'feedback_request' | 'scheduled' | 'rescheduled' | 'cancelled';
  organizationId: string;
  appointmentId: string;
  patientId: string;
  date: string;
  time: string;
  patientName?: string;
  therapistName?: string;
}

// ============================================================================
// CALLABLE FUNCTION: Send Notification
// ============================================================================

export const sendNotification = onCall(
  {
    region: 'southamerica-east1',
    cors: CORS_ORIGINS,
  },
  async (request) => {
    const { userId, organizationId, type, data } = request.data as SendNotificationData;

    logger.info('[sendNotification] Processing notification request', {
      userId,
      organizationId,
      type,
    });

    const db = getAdminDb();

    try {
      const results: Record<string, any> = {};

      // Send Email
      if (type === 'email' || type === 'all') {
        try {
          const emailResult = await sendEmail({
            to: data.to,
            subject: data.subject || 'FisioFlow',
            html: data.body,
          });
          results.email = {
            sent: emailResult.success,
            error: emailResult.error || null,
          };
          logger.info('[sendNotification] Email sent', { success: emailResult.success });
        } catch (error) {
          results.email = {
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          logger.error('[sendNotification] Email error', { error });
        }
      }

      // Send WhatsApp
      if (type === 'whatsapp' || type === 'all') {
        try {
          const whatsappResult = await sendWhatsAppTextMessageInternal({
            to: data.to,
            message: data.body,
          });
          results.whatsapp = {
            sent: whatsappResult.success,
            error: whatsappResult.error || null,
          };
          logger.info('[sendNotification] WhatsApp sent', { success: whatsappResult.success });
        } catch (error) {
          results.whatsapp = {
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          logger.error('[sendNotification] WhatsApp error', { error });
        }
      }

      // Send Push
      if (type === 'push' || type === 'all') {
        try {
          const pushResult = await sendPushNotificationToUser(userId, {
            title: data.subject || 'Notificação',
            body: data.body,
            data: data as any,
          });
          results.push = {
            sent: pushResult.successCount > 0,
            error: pushResult.errors.length > 0 ? pushResult.errors.join(', ') : null,
          };
          logger.info('[sendNotification] Push sent', { success: pushResult.successCount > 0 });
        } catch (error) {
          results.push = {
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          logger.error('[sendNotification] Push error', { error });
        }
      }

      // Log notification
      await db.collection('notifications').add({
        user_id: userId,
        organization_id: organizationId,
        type,
        channels_sent: Object.keys(results).filter(k => results[k].sent),
        results,
        created_at: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        results,
      };
    } catch (error) {
      logger.error('[sendNotification] Fatal error', { error });
      throw new HttpsError(
        'internal',
        'Failed to send notification',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: Send Batch Notifications
// ============================================================================

export const sendNotificationBatch = onCall(
  {
    region: 'southamerica-east1',
    cors: CORS_ORIGINS,
  },
  async (request) => {
    const { notifications, organizationId }: { notifications: SendNotificationData[]; organizationId: string } = request.data;

    if (!Array.isArray(notifications)) {
      throw new HttpsError('invalid-argument', 'notifications must be an array');
    }

    if (notifications.length > 100) {
      throw new HttpsError('invalid-argument', 'Maximum 100 notifications per batch');
    }

    logger.info('[sendNotificationBatch] Processing batch', {
      count: notifications.length,
      organizationId,
    });

    const db = getAdminDb();

    try {
      const results = await Promise.all(
        notifications.map(async (notif) => {
          const result: Record<string, any> = {};

          // Send Email
          if (notif.type === 'email' || notif.type === 'all') {
            try {
              const emailResult = await sendEmail({
                to: notif.data.to,
                subject: notif.data.subject || 'FisioFlow',
                html: notif.data.body,
              });
              result.email = {
                sent: emailResult.success,
                error: emailResult.error || null,
              };
            } catch (error) {
              result.email = {
                sent: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          }

          // Send WhatsApp
          if (notif.type === 'whatsapp' || notif.type === 'all') {
            try {
              const whatsappResult = await sendWhatsAppTextMessageInternal({
                to: notif.data.to,
                message: notif.data.body,
              });
              result.whatsapp = {
                sent: whatsappResult.success,
                error: whatsappResult.error || null,
              };
            } catch (error) {
              result.whatsapp = {
                sent: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          }

          // Send Push
          if (notif.type === 'push' || notif.type === 'all') {
            try {
              const pushResult = await sendPushNotificationToUser(notif.userId, {
                title: notif.data.subject || 'Notificação',
                body: notif.data.body,
                data: notif.data as any,
              });
              result.push = {
                sent: pushResult.successCount > 0,
                error: pushResult.errors.length > 0 ? pushResult.errors.join(', ') : null,
              };
            } catch (error) {
              result.push = {
                sent: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          }

          // Log notification
          await db.collection('notifications').add({
            user_id: notif.userId,
            organization_id: organizationId,
            type: notif.type,
            channels_sent: Object.keys(result).filter(k => result[k].sent),
            results: result,
            created_at: FieldValue.serverTimestamp(),
          });

          return {
            userId: notif.userId,
            result,
          };
        })
      );

      return {
        success: true,
        processed: results.length,
        results,
      };
    } catch (error) {
      logger.error('[sendNotificationBatch] Fatal error', { error });
      throw new HttpsError(
        'internal',
        'Failed to send batch notifications',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

// ============================================================================
// PUBSUB: Process Notification Queue
// ============================================================================

export const processNotificationQueue = onMessagePublished(
  {
    topic: 'notifications',
    region: 'southamerica-east1',
  },
  async (event) => {
    if (!event.data) return;

    const data = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());

    logger.info('[processNotificationQueue] Processing notification', {
      notificationId: data.id,
      type: data.type,
    });

    // Process notification based on type
    // Implementation depends on notification type
    return null;
  }
);

// ============================================================================
// CALLABLE: Appointment Notifications
// ============================================================================

export const notifyAppointmentScheduled = onCall(
  { region: 'southamerica-east1', cors: CORS_ORIGINS },
  async (request) => {
    return dispatchAppointmentNotification({
      kind: 'scheduled',
      ...request.data
    });
  }
);

export const notifyAppointmentReschedule = onCall(
  { region: 'southamerica-east1', cors: CORS_ORIGINS },
  async (request) => {
    return dispatchAppointmentNotification({
      kind: 'rescheduled',
      ...request.data
    });
  }
);

export const notifyAppointmentCancellation = onCall(
  { region: 'southamerica-east1', cors: CORS_ORIGINS },
  async (request) => {
    return dispatchAppointmentNotification({
      kind: 'cancellation',
      ...request.data
    });
  }
);

// ============================================================================
// HTTP: Email Webhook
// ============================================================================

export const emailWebhook = functions.https.onRequest(
  { region: 'southamerica-east1' },
  async (req, res) => {
    logger.info('[emailWebhook] Received webhook', { body: req.body });
    res.status(200).send('OK');
  }
);

// ============================================================================
// HELPER: Dispatch Appointment Notification
// ============================================================================

export async function dispatchAppointmentNotification(
  params: DispatchAppointmentNotificationParams
): Promise<{ email: any; whatsapp: any; push: any }> {
  const { kind, patientId, date, time } = params;
  let { patientName, therapistName } = params;

  const results: { email: any; whatsapp: any; push: any } = {
    email: { sent: false, error: null },
    whatsapp: { sent: false, error: null },
    push: { sent: false, error: null },
  };

  const db = getAdminDb();
  const messaging = getAdminMessaging();

  try {
    // Fetch patient for contact info
    const patientSnap = await db.collection('patients').doc(patientId).get();
    if (!patientSnap.exists) {
      results.email.error = 'Patient not found';
      results.whatsapp.error = 'Patient not found';
      return results;
    }

    const patient = patientSnap.data() as any;
    const email = patient.email;
    const phone = patient.phone;
    const pushToken = patient.push_token;

    if (!patientName) {
      patientName = patient.full_name || patient.name || 'Paciente';
    }

    if (!therapistName) {
      therapistName = 'Seu fisioterapeuta';
    }

    // Send Email
    if (email) {
      try {
        let emailResult;
        if (kind === 'confirmation' || kind === 'scheduled' || kind === 'rescheduled') {
          emailResult = await sendAppointmentConfirmationEmail(email, {
            patientName: patientName!,
            therapistName: therapistName!,
            date,
            time,
            clinicName: 'FisioFlow',
          });
        } else {
          emailResult = await sendAppointmentReminderEmail(email, {
            patientName: patientName!,
            therapistName: therapistName!,
            date,
            time,
            clinicName: 'FisioFlow',
          });
        }
        results.email = {
          sent: emailResult.success,
          error: emailResult.error || null,
        };
      } catch (error) {
        results.email.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Send WhatsApp
    if (phone) {
      try {
        const formattedPhone = formatPhoneForWhatsApp(phone);
        const template = {
          name: (kind === 'confirmation' || kind === 'scheduled' || kind === 'rescheduled') ? 'appointment_confirmation_v1' : 'appointment_reminder_v1',
          languageCode: 'pt_BR',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patientName! },
                { type: 'text', text: `${date} às ${time}` },
                { type: 'text', text: therapistName! },
              ],
            },
          ],
        };

        const whatsappResult = await sendWhatsAppTemplateMessageInternal({
          to: formattedPhone,
          template: template.name,
          language: template.languageCode,
          components: template.components
        });
        results.whatsapp = {
          sent: whatsappResult.success,
          error: whatsappResult.error || null,
        };
      } catch (error) {
        results.whatsapp.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Send Push
    if (pushToken) {
      try {
        const message = {
          notification: {
            title: (kind === 'confirmation' || kind === 'scheduled' || kind === 'rescheduled') ? 'Consulta Agendada' : 'Lembrete de Consulta',
            body: (kind === 'confirmation' || kind === 'scheduled' || kind === 'rescheduled') ? `Olá ${patientName}, sua consulta está agendada!` : `Olá ${patientName}, lembrete da sua consulta às ${time}`,
          },
          data: {
            type: 'appointment',
            kind,
            appointmentId: params.appointmentId,
            date,
            time,
          },
          token: pushToken,
        };

        await messaging.send(message);
        results.push = { sent: true, error: null };
      } catch (error) {
        results.push.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return results;
  } catch (error) {
    logger.error('[dispatchAppointmentNotification] Fatal error', { error });
    return results;
  }
}

// ============================================================================
// HELPER: Send Feedback Request
// ============================================================================

export async function sendFeedbackRequest(
  appointmentId: string,
  patientId: string
): Promise<boolean> {
  const db = getAdminDb();

  try {
    // Fetch appointment details
    const appointmentSnap = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentSnap.exists) {
      logger.warn('[sendFeedbackRequest] Appointment not found', { appointmentId });
      return false;
    }

    const appointment = appointmentSnap.data() as any;

    // Fetch patient contact info
    const patientSnap = await db.collection('patients').doc(patientId).get();
    if (!patientSnap.exists) {
      logger.warn('[sendFeedbackRequest] Patient not found', { patientId });
      return false;
    }

    const patient = patientSnap.data() as any;

    // Create feedback request record
    await db.collection('feedback_requests').add({
      appointment_id: appointmentId,
      patient_id: patientId,
      status: 'pending',
      sent_at: FieldValue.serverTimestamp(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    // Send notification
    if (patient.email) {
      await sendEmail({
        to: patient.email,
        subject: 'Como foi sua consulta? - FisioFlow',
        html: `Olá ${patient.full_name || patient.name},\n\nGostaríamos saber sua opinião sobre a consulta de ${appointment.date} às ${appointment.time}.\n\nPor favor, responda este e-mail ou acesse o aplicativo para deixar seu feedback.\n\nObrigado,\nEquipe FisioFlow`
      });
    }

    return true;
  } catch (error) {
    logger.error('[sendFeedbackRequest] Error', { appointmentId, patientId, error });
    return false;
  }
}

// ============================================================================
// HELPER: Send Daily Summary
// ============================================================================

export async function sendDailySummary(organizationId: string): Promise<void> {
  const db = getAdminDb();

  try {
    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await db
      .collection('appointments')
      .where('organization_id', '==', organizationId)
      .where('status', '==', 'agendado')
      .where('date', '>=', today.toISOString())
      .where('date', '<', tomorrow.toISOString())
      .get();

    // Get organization admin email
    const orgSnap = await db.collection('organizations').doc(organizationId).get();
    if (!orgSnap.exists) return;

    const org = orgSnap.data() as any;

    // Send summary
    const summary = `
      Resumo do dia - ${today.toLocaleDateString('pt-BR')}

      Consultas agendadas: ${appointments.docs.length}
      ${appointments.docs.map(doc => {
        const apt = doc.data() as any;
        return `- ${apt.time} - ${apt.patient_name || 'Paciente'}`;
      }).join('\n')}
    `;

    // Send to admin email if available
    if (org.admin_email) {
      await sendEmail({
        to: org.admin_email,
        subject: `Resumo do dia - ${today.toLocaleDateString('pt-BR')}`,
        html: summary
      });
    }
  } catch (error) {
    logger.error('[sendDailySummary] Error', { organizationId, error });
  }
}
