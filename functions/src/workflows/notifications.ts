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


// Firebase Functions v2 CORS - explicitly list allowed origins

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { logger } from 'firebase-functions';
import { getAdminDb, getAdminMessaging } from '../init';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail, sendEmail } from '../communications/resend-templates';
import {
  WhatsAppTemplate,
  formatPhoneForWhatsApp,
  sendWhatsAppTemplateMessageInternal,
  sendWhatsAppTextMessageInternal,
} from '../communications/whatsapp';

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
  type: 'email' | 'whatsapp' | 'push';
  data: {
    to: string;
    subject?: string;
    body: string;
    [key: string]: any;
  };
}

interface NotificationResult {
  sent: boolean;
  channel: string;
  error?: string;
}

interface NotificationDocument {
  user_id: string;
  organization_id: string;
  type: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  data: Record<string, any>;
  created_at: string;
  sent_at?: string;
  error_message?: string | null;
  retry_count?: number;
}

type AppointmentNotificationKind = 'scheduled' | 'rescheduled' | 'cancelled' | 'reminder_24h' | 'reminder_2h';

export interface ScheduleNotificationSettings {
  send_confirmation_email?: boolean;
  send_confirmation_whatsapp?: boolean;
  send_reminder_24h?: boolean;
  send_reminder_2h?: boolean;
  send_cancellation_notice?: boolean;
  custom_confirmation_message?: string;
  custom_reminder_message?: string;
}

export interface DispatchAppointmentNotificationInput {
  kind: AppointmentNotificationKind;
  organizationId: string;
  patientId: string;
  appointmentId: string;
  date: string;
  time: string;
  patientName?: string;
  therapistName?: string;
}

export interface DispatchAppointmentNotificationResult {
  email: NotificationResult;
  whatsapp: NotificationResult;
}

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

function getNotificationsCollection() {
  const db = getAdminDb();
  return db.collection('notifications');
}

const DEFAULT_SCHEDULE_NOTIFICATION_SETTINGS: Required<Pick<
  ScheduleNotificationSettings,
  'send_confirmation_email' | 'send_confirmation_whatsapp' | 'send_reminder_24h' | 'send_reminder_2h' | 'send_cancellation_notice'
>> = {
  send_confirmation_email: true,
  send_confirmation_whatsapp: true,
  send_reminder_24h: true,
  send_reminder_2h: true,
  send_cancellation_notice: true,
};

function formatDatePtBr(dateValue: string): string {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }
  return parsed.toLocaleDateString('pt-BR');
}

function renderTemplateMessage(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [key, value]) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return acc.replace(new RegExp(escapedKey, 'g'), value);
  }, template);
}

function getDefaultMessage(kind: AppointmentNotificationKind, patientName: string, date: string, time: string): string {
  if (kind === 'cancelled') {
    return `Olá ${patientName}, sua consulta de ${date} às ${time} foi cancelada.`;
  }
  if (kind === 'reminder_24h' || kind === 'reminder_2h') {
    return `Olá ${patientName}, lembrete da sua consulta em ${date} às ${time}.`;
  }
  if (kind === 'rescheduled') {
    return `Olá ${patientName}, sua consulta foi reagendada para ${date} às ${time}.`;
  }
  return `Olá ${patientName}, sua consulta foi confirmada para ${date} às ${time}.`;
}

export async function dispatchAppointmentNotification(
  input: DispatchAppointmentNotificationInput
): Promise<DispatchAppointmentNotificationResult> {
  const db = getAdminDb();
  const patientSnap = await db.collection('patients').doc(input.patientId).get();
  const patientData = patientSnap.exists ? (patientSnap.data() as Record<string, any>) : {};
  const resolvedOrganizationId = (
    input.organizationId && input.organizationId !== 'system'
      ? input.organizationId
      : String(patientData.organization_id || input.organizationId || 'system')
  );
  const [settingsSnap, organizationSnap] = await Promise.all([
    db.collection('schedule_notification_settings').doc(resolvedOrganizationId).get(),
    db.collection('organizations').doc(resolvedOrganizationId).get(),
  ]);
  const settings = {
    ...DEFAULT_SCHEDULE_NOTIFICATION_SETTINGS,
    ...(settingsSnap.exists ? (settingsSnap.data() as ScheduleNotificationSettings) : {}),
  };
  const organizationData = organizationSnap.exists ? (organizationSnap.data() as Record<string, any>) : {};

  const patientName = input.patientName || String(patientData.full_name || patientData.name || 'Paciente');
  const therapistName = input.therapistName || 'Seu fisioterapeuta';
  const clinicName = String(organizationData.name || 'FisioFlow');
  const clinicAddress = organizationData.address ? String(organizationData.address) : undefined;
  const dateLabel = formatDatePtBr(input.date);
  const templateVars = {
    '{nome}': patientName,
    '{data}': dateLabel,
    '{hora}': input.time,
    '{tipo}': 'Fisioterapia',
    '{terapeuta}': therapistName,
  };

  const eventAllowsEmail = input.kind === 'cancelled'
    ? !!settings.send_cancellation_notice
    : (input.kind === 'reminder_24h'
      ? !!settings.send_reminder_24h
      : (input.kind === 'reminder_2h'
        ? !!settings.send_reminder_2h
        : !!settings.send_confirmation_email));
  const eventAllowsWhatsApp = input.kind === 'cancelled'
    ? !!settings.send_cancellation_notice
    : (input.kind === 'reminder_24h'
      ? !!settings.send_reminder_24h
      : (input.kind === 'reminder_2h'
        ? !!settings.send_reminder_2h
        : !!settings.send_confirmation_whatsapp));

  const email = patientData.email ? String(patientData.email) : '';
  const phone = patientData.phone ? String(patientData.phone) : '';

  const emailResult: NotificationResult = {
    sent: false,
    channel: 'email',
  };
  if (!eventAllowsEmail) {
    emailResult.error = 'Disabled by schedule settings';
  } else if (!email) {
    emailResult.error = 'Patient has no email';
  } else {
    try {
      if (input.kind === 'cancelled') {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
            <h2 style="margin: 0 0 12px;">Consulta cancelada</h2>
            <p>Olá <strong>${patientName}</strong>,</p>
            <p>Sua consulta de <strong>${dateLabel}</strong> às <strong>${input.time}</strong> foi cancelada.</p>
            <p style="color: #6b7280; margin-top: 16px;">${clinicName}</p>
          </div>
        `;
        const sendResult = await sendEmail({
          to: email,
          subject: 'Consulta cancelada',
          html,
        });
        emailResult.sent = !!sendResult.success;
        emailResult.error = sendResult.error;
      } else if (input.kind === 'reminder_24h' || input.kind === 'reminder_2h') {
        const customTemplate = (settings.custom_reminder_message || '').trim();
        if (customTemplate) {
          const rendered = renderTemplateMessage(customTemplate, templateVars);
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
              <p style="white-space: pre-wrap;">${rendered}</p>
              <p style="color: #6b7280; margin-top: 16px;">${clinicName}</p>
            </div>
          `;
          const sendResult = await sendEmail({
            to: email,
            subject: 'Lembrete de consulta',
            html,
          });
          emailResult.sent = !!sendResult.success;
          emailResult.error = sendResult.error;
        } else {
          const sendResult = await sendAppointmentReminderEmail(email, {
            patientName,
            therapistName,
            date: input.date,
            time: input.time,
            clinicName,
          });
          emailResult.sent = !!sendResult.success;
          emailResult.error = sendResult.error;
        }
      } else {
        const customTemplate = (settings.custom_confirmation_message || '').trim();
        if (customTemplate) {
          const rendered = renderTemplateMessage(customTemplate, templateVars);
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
              <p style="white-space: pre-wrap;">${rendered}</p>
              <p style="color: #6b7280; margin-top: 16px;">${clinicName}</p>
            </div>
          `;
          const sendResult = await sendEmail({
            to: email,
            subject: input.kind === 'rescheduled' ? 'Consulta reagendada' : 'Consulta confirmada',
            html,
          });
          emailResult.sent = !!sendResult.success;
          emailResult.error = sendResult.error;
        } else {
          const sendResult = await sendAppointmentConfirmationEmail(email, {
            patientName,
            therapistName,
            date: input.date,
            time: input.time,
            clinicName,
            clinicAddress,
          });
          emailResult.sent = !!sendResult.success;
          emailResult.error = sendResult.error;
        }
      }
    } catch (error) {
      emailResult.sent = false;
      emailResult.error = error instanceof Error ? error.message : 'Failed to send email';
    }
  }

  const whatsappResult: NotificationResult = {
    sent: false,
    channel: 'whatsapp',
  };
  if (!eventAllowsWhatsApp) {
    whatsappResult.error = 'Disabled by schedule settings';
  } else if (!phone) {
    whatsappResult.error = 'Patient has no phone';
  } else {
    const to = formatPhoneForWhatsApp(phone);
    const fallbackMessage = getDefaultMessage(input.kind, patientName, dateLabel, input.time);
    const customTemplate = ((
      input.kind === 'reminder_24h' || input.kind === 'reminder_2h'
        ? settings.custom_reminder_message
        : settings.custom_confirmation_message
    ) || '').trim();

    try {
      if (customTemplate && input.kind !== 'cancelled') {
        await sendWhatsAppTextMessageInternal({
          to,
          message: renderTemplateMessage(customTemplate, templateVars),
        });
        whatsappResult.sent = true;
      } else {
        const template = input.kind === 'cancelled'
          ? WhatsAppTemplate.APPOINTMENT_CANCELLED
          : (input.kind === 'reminder_24h' || input.kind === 'reminder_2h'
            ? WhatsAppTemplate.APPOINTMENT_REMINDER
            : WhatsAppTemplate.APPOINTMENT_CONFIRMATION);
        await sendWhatsAppTemplateMessageInternal({
          to,
          template,
          language: 'pt_BR',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patientName },
                { type: 'text', text: dateLabel },
                { type: 'text', text: input.time },
              ],
            },
          ],
        });
        whatsappResult.sent = true;
      }
    } catch (templateError) {
      try {
        await sendWhatsAppTextMessageInternal({ to, message: fallbackMessage });
        whatsappResult.sent = true;
      } catch (textError) {
        whatsappResult.sent = false;
        whatsappResult.error = textError instanceof Error
          ? textError.message
          : (templateError instanceof Error ? templateError.message : 'Failed to send WhatsApp');
      }
    }
  }

  return {
    email: emailResult,
    whatsapp: whatsappResult,
  };
}

// ============================================================================
// CALLABLE FUNCTION: Send Single Notification
// ============================================================================

/**
 * Send a single notification
 *
 * Usage:
 * ```ts
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const sendNotification = httpsCallable(functions, 'sendNotification');
 *
 * const result = await sendNotification({
 *   userId: 'xxx',
 *   organizationId: 'yyy',
 *   type: 'email',
 *   data: { to: 'user@example.com', subject: 'Test', body: 'Hello' }
 * });
 * ```
 */
export const sendNotification = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    // Auth check
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Validate input
    const { userId, organizationId, type, notificationData } = data as {
      userId: string;
      organizationId: string;
      type: string;
      notificationData: SendNotificationData['data'];
    };

    if (!userId || !organizationId || !type || !notificationData) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const validTypes = ['email', 'whatsapp', 'push'];
    if (!validTypes.includes(type)) {
      throw new HttpsError('invalid-argument', `Invalid notification type: ${type}`);
    }

    const db = getAdminDb();

    try {
      // Log notification attempt
      const notificationRef = getNotificationsCollection().doc();
      const notificationId = notificationRef.id;

      const notificationDoc: NotificationDocument = {
        user_id: userId,
        organization_id: organizationId,
        type,
        channel: type,
        status: 'pending',
        data: notificationData,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      await notificationRef.create(notificationDoc);

      // Send based on type
      const result: NotificationResult = await sendNotificationByType(
        type,
        notificationData,
        db,
        userId
      );

      // Update notification status
      await notificationRef.update({
        status: result.sent ? 'sent' : 'failed',
        sent_at: FieldValue.serverTimestamp(),
        error_message: result.error || null,
      });

      logger.info('[sendNotification] Notification processed', {
        notificationId,
        sent: result.sent,
        channel: result.channel,
      });

      return {
        success: result.sent,
        notificationId,
        result,
      };
    } catch (error) {
      logger.error('[sendNotification] Error sending notification', {
        userId,
        type,
        error,
      });
      throw new HttpsError('internal', 'Failed to send notification');
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: Schedule Appointment Notification
// ============================================================================

export const notifyAppointmentScheduled = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { appointmentId, patientId, date, time, patientName, organizationId } = data as {
      appointmentId: string;
      patientId: string;
      date: string;
      time: string;
      patientName?: string;
      organizationId?: string;
    };

    if (!appointmentId || !patientId || !date || !time) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const db = getAdminDb();
    const notificationRef = getNotificationsCollection().doc();
    const notificationId = notificationRef.id;

    const notificationData = {
      appointmentId,
      patientId,
      date,
      time,
      patientName,
    };

    const notificationDoc: NotificationDocument = {
      user_id: patientId,
      organization_id: organizationId || 'system',
      type: 'push',
      channel: 'push',
      status: 'pending',
      data: notificationData,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await notificationRef.create(notificationDoc);

    const channelDispatch = await dispatchAppointmentNotification({
      kind: 'scheduled',
      organizationId: organizationId || 'system',
      patientId,
      appointmentId,
      date,
      time,
      patientName,
    });

    const pushData: SendNotificationData['data'] = {
      to: patientId,
      subject: 'Lembrete de Consulta',
      body: `Olá ${patientName || 'paciente'}, você tem uma consulta agendada para ${new Date(date).toLocaleDateString('pt-BR')} às ${time}.`,
      appointmentId,
      action: 'appointment_reminder',
    };
    const pushResult = await sendNotificationByType('push', pushData, db, patientId);
    const result: NotificationResult = {
      sent: channelDispatch.email.sent || channelDispatch.whatsapp.sent || pushResult.sent,
      channel: 'appointment_multichannel',
      error: [
        channelDispatch.email.error,
        channelDispatch.whatsapp.error,
        pushResult.error,
      ].filter(Boolean).join(' | ') || undefined,
    };

    await notificationRef.update({
      status: result.sent ? 'sent' : 'failed',
      sent_at: FieldValue.serverTimestamp(),
      error_message: result.error || null,
      channel_results: {
        email: channelDispatch.email,
        whatsapp: channelDispatch.whatsapp,
        push: pushResult,
      },
    });

    return {
      success: result.sent,
      notificationId,
      result,
    };
  }
);

// ============================================================================
// CALLABLE FUNCTION: Reschedule Appointment Notification
// ============================================================================

export const notifyAppointmentReschedule = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { appointmentId, patientId, newDate, newTime, patientName, organizationId } = data as {
      appointmentId: string;
      patientId: string;
      newDate: string;
      newTime: string;
      patientName?: string;
      organizationId?: string;
    };

    if (!appointmentId || !patientId || !newDate || !newTime) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const db = getAdminDb();
    const notificationRef = getNotificationsCollection().doc();
    const notificationId = notificationRef.id;

    const notificationData = {
      appointmentId,
      patientId,
      date: newDate,
      time: newTime,
      patientName,
    };

    const notificationDoc: NotificationDocument = {
      user_id: patientId,
      organization_id: organizationId || 'system',
      type: 'push',
      channel: 'push',
      status: 'pending',
      data: notificationData,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await notificationRef.create(notificationDoc);

    const channelDispatch = await dispatchAppointmentNotification({
      kind: 'rescheduled',
      organizationId: organizationId || 'system',
      patientId,
      appointmentId,
      date: newDate,
      time: newTime,
      patientName,
    });

    const pushData: SendNotificationData['data'] = {
      to: patientId,
      subject: 'Consulta Reagendada',
      body: `Olá ${patientName || 'paciente'}, sua consulta foi reagendada para ${new Date(newDate).toLocaleDateString('pt-BR')} às ${newTime}.`,
      appointmentId,
      action: 'appointment_reschedule',
    };
    const pushResult = await sendNotificationByType('push', pushData, db, patientId);
    const result: NotificationResult = {
      sent: channelDispatch.email.sent || channelDispatch.whatsapp.sent || pushResult.sent,
      channel: 'appointment_multichannel',
      error: [
        channelDispatch.email.error,
        channelDispatch.whatsapp.error,
        pushResult.error,
      ].filter(Boolean).join(' | ') || undefined,
    };

    await notificationRef.update({
      status: result.sent ? 'sent' : 'failed',
      sent_at: FieldValue.serverTimestamp(),
      error_message: result.error || null,
      channel_results: {
        email: channelDispatch.email,
        whatsapp: channelDispatch.whatsapp,
        push: pushResult,
      },
    });

    return {
      success: result.sent,
      notificationId,
      result,
    };
  }
);

// ============================================================================
// CALLABLE FUNCTION: Cancel Appointment Notification
// ============================================================================

export const notifyAppointmentCancellation = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { appointmentId, patientId, date, time, patientName, organizationId } = data as {
      appointmentId: string;
      patientId: string;
      date: string;
      time: string;
      patientName?: string;
      organizationId?: string;
    };

    if (!appointmentId || !patientId || !date || !time) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const db = getAdminDb();
    const notificationRef = getNotificationsCollection().doc();
    const notificationId = notificationRef.id;

    const notificationData = {
      appointmentId,
      patientId,
      date,
      time,
      patientName,
    };

    const notificationDoc: NotificationDocument = {
      user_id: patientId,
      organization_id: organizationId || 'system',
      type: 'push',
      channel: 'push',
      status: 'pending',
      data: notificationData,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await notificationRef.create(notificationDoc);

    const channelDispatch = await dispatchAppointmentNotification({
      kind: 'cancelled',
      organizationId: organizationId || 'system',
      patientId,
      appointmentId,
      date,
      time,
      patientName,
    });

    const pushData: SendNotificationData['data'] = {
      to: patientId,
      subject: 'Consulta Cancelada',
      body: `Olá ${patientName || 'paciente'}, sua consulta de ${new Date(date).toLocaleDateString('pt-BR')} às ${time} foi cancelada.`,
      appointmentId,
      action: 'appointment_cancellation',
    };
    const pushResult = await sendNotificationByType('push', pushData, db, patientId);
    const result: NotificationResult = {
      sent: channelDispatch.email.sent || channelDispatch.whatsapp.sent || pushResult.sent,
      channel: 'appointment_multichannel',
      error: [
        channelDispatch.email.error,
        channelDispatch.whatsapp.error,
        pushResult.error,
      ].filter(Boolean).join(' | ') || undefined,
    };

    await notificationRef.update({
      status: result.sent ? 'sent' : 'failed',
      sent_at: FieldValue.serverTimestamp(),
      error_message: result.error || null,
      channel_results: {
        email: channelDispatch.email,
        whatsapp: channelDispatch.whatsapp,
        push: pushResult,
      },
    });

    return {
      success: result.sent,
      notificationId,
      result,
    };
  }
);

// ============================================================================
// CALLABLE FUNCTION: Send Batch Notifications
// ============================================================================

interface SendBatchNotificationsData {
  organizationId: string;
  notifications: Array<{
    userId: string;
    type: 'email' | 'whatsapp' | 'push';
    data: SendNotificationData['data'];
  }>;
}

export const sendNotificationBatch = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; queued: number; timestamp: string }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { organizationId, notifications } = data as SendBatchNotificationsData;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      throw new HttpsError('invalid-argument', 'No notifications provided');
    }

    if (notifications.length > 100) {
      throw new HttpsError('out-of-range', 'Maximum 100 notifications per batch');
    }

    const db = getAdminDb();
    const batch = db.batch();
    const notificationIds: string[] = [];

    // Create notification records in batch
    for (const notification of notifications) {
      const ref = getNotificationsCollection().doc();
      notificationIds.push(ref.id);

      const notificationDoc: NotificationDocument = {
        user_id: notification.userId,
        organization_id: organizationId,
        type: notification.type,
        channel: notification.type,
        status: 'pending',
        data: notification.data,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      batch.create(ref, notificationDoc);
    }

    await batch.commit();

    // Queue for async processing via Pub/Sub
    // In production, you would publish to a Pub/Sub topic here
    // and have a separate function handle the actual sending

    logger.info('[sendNotificationBatch] Batch queued', {
      count: notifications.length,
      notificationIds,
    });

    return {
      success: true,
      queued: notifications.length,
      timestamp: new Date().toISOString(),
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function sendNotificationByType(
  type: string,
  data: SendNotificationData['data'],
  db: ReturnType<typeof getAdminDb>,
  userId: string
): Promise<NotificationResult> {
  switch (type) {
    case 'email': {
      const to = String(data.to || data.email || '').trim();
      if (!to || !to.includes('@')) {
        return { sent: false, channel: 'email', error: 'Invalid email recipient' };
      }
      const subject = String(data.subject || 'FisioFlow');
      const body = String(data.body || '');
      const html = typeof data.html === 'string' && data.html.trim()
        ? data.html
        : `<div style="font-family: Arial, sans-serif; line-height: 1.5;"><p style="white-space: pre-wrap;">${body}</p></div>`;
      const result = await sendEmail({ to, subject, html });
      return { sent: !!result.success, channel: 'email', error: result.error };
    }

    case 'whatsapp': {
      const to = String(data.to || data.phone || '').trim();
      if (!to) {
        return { sent: false, channel: 'whatsapp', error: 'Missing recipient phone' };
      }
      try {
        await sendWhatsAppTextMessageInternal({
          to: formatPhoneForWhatsApp(to),
          message: String(data.body || ''),
        });
        return { sent: true, channel: 'whatsapp' };
      } catch (error) {
        return {
          sent: false,
          channel: 'whatsapp',
          error: error instanceof Error ? error.message : 'Failed to send WhatsApp',
        };
      }
    }

    case 'push': {
      const messaging = getAdminMessaging();

      // Get user's push tokens
      const tokensSnapshot = await db
        .collection('user_tokens')
        .doc(userId)
        .collection('push')
        .where('active', '==', true)
        .get();

      if (tokensSnapshot.empty) {
        logger.warn('[Notification] No push tokens found', { userId });
        return { sent: false, channel: 'push', error: 'No tokens found' };
      }

      const tokens = tokensSnapshot.docs.map((doc) => doc.data().token).filter((t) => !!t);

      if (tokens.length === 0) {
        return { sent: false, channel: 'push', error: 'No valid tokens' };
      }

      const message = {
        notification: {
          title: data.subject || 'FisioFlow',
          body: data.body,
        },
        data: Object.entries(data).reduce(
          (acc: Record<string, string>, [k, v]) => ({
            ...acc,
            [k]: String(v),
          }),
          { type: 'PROMOTIONAL' }
        ),
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      if (response.failureCount > 0) {
        logger.warn('[Notification] Some push notifications failed', {
          success: response.successCount,
          failure: response.failureCount,
        });

        // Clean up invalid tokens
        const batch = db.batch();
        for (let i = 0; i < response.responses.length; i++) {
          if (!response.responses[i].success) {
            const error = response.responses[i].error;
            if (error?.code === 'messaging/registration-token-not-registered') {
              // Find and delete the invalid token
              const invalidToken = tokens[i];
              const invalidTokenDocs = tokensSnapshot.docs.filter(
                (doc) => doc.data().token === invalidToken
              );
              invalidTokenDocs.forEach((doc) => batch.delete(doc.ref));
            }
          }
        }
        if (response.failureCount > 0) {
          await batch.commit();
        }
      }

      return {
        sent: response.successCount > 0,
        channel: 'push',
        error: response.failureCount === tokens.length ? 'All failed' : undefined,
      };
    }

    default:
      return { sent: false, channel: type, error: 'Unknown type' };
  }
}

// ============================================================================
// PUBSUB FUNCTION: Process Notification Queue
// ============================================================================

/**
 * Process notification queue
 * Triggered by Pub/Sub for async processing
 *
 * To trigger this function:
 * ```bash
 * gcloud pubsub topics publish notification-queue --message='{...}'
 * ```
 */
export const processNotificationQueue = onMessagePublished(
  {
    topic: 'notification-queue',
    region: 'southamerica-east1',
  },
  async (event) => {
    const message = event.data.message.json;
    logger.info('[processNotificationQueue] Processing notification', { message });

    // Process notification from queue
    // This would handle the actual sending to email/whatsapp providers

    return {
      success: true,
      processedAt: new Date().toISOString(),
    };
  }
);

// ============================================================================
// HTTP FUNCTION: Webhook for Email Provider (e.g., SendGrid)
// ============================================================================

/**
 * Webhook for email delivery status updates
 * Integrates with SendGrid/Mailgun webhooks
 */
export const emailWebhook = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request) => {
    const { data } = request;
    // Process webhook data from email provider
    // Update notification status in Firestore

    logger.info('[emailWebhook] Received webhook', { data });

    return { success: true };
  }
);
