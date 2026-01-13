/**
 * Inngest Helper Functions
 *
 * Convenience functions to send events to Inngest from anywhere in the app
 */

import { inngest } from './client';
import { Events } from './types';

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Send a notification (email, WhatsApp, or push)
 */
export async function sendNotification(data: {
  userId: string;
  organizationId: string;
  type: 'email' | 'whatsapp' | 'push';
  to: string;
  subject?: string;
  body: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
}) {
  return inngest.send({
    name: Events.NOTIFICATION_SEND,
    data,
  });
}

/**
 * Send notifications to multiple users
 */
export async function sendBulkNotifications(notifications: Array<{
  userId: string;
  organizationId: string;
  type: 'email' | 'whatsapp' | 'push';
  to: string;
  subject?: string;
  body: string;
}>) {
  return inngest.send({
    name: Events.NOTIFICATION_SEND_BATCH,
    data: {
      organizationId: notifications[0]?.organizationId || '',
      notifications,
    },
  });
}

// ============================================================================
// EMAIL HELPERS
// ============================================================================

/**
 * Send an email
 */
export async function sendEmail(data: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}) {
  return inngest.send({
    name: Events.EMAIL_SEND,
    data,
  });
}

/**
 * Send bulk emails
 */
export async function sendBulkEmails(emails: Array<{
  to: string;
  subject: string;
  html?: string;
  text?: string;
}>) {
  return inngest.send({
    name: Events.EMAIL_SEND_BATCH,
    data: { emails },
  });
}

// ============================================================================
// WHATSAPP HELPERS
// ============================================================================

/**
 * Send a WhatsApp message
 */
export async function sendWhatsApp(data: {
  to: string;
  message: string;
  type?: 'text' | 'template' | 'media';
  mediaUrl?: string;
}) {
  return inngest.send({
    name: Events.WHATSAPP_SEND,
    data,
  });
}

/**
 * Send bulk WhatsApp messages
 */
export async function sendBulkWhatsApp(messages: Array<{
  to: string;
  message: string;
}>) {
  return inngest.send({
    name: Events.WHATSAPP_SEND_BATCH,
    data: { messages },
  });
}

// ============================================================================
// APPOINTMENT HELPERS
// ============================================================================

/**
 * Trigger appointment reminder workflow
 */
export async function triggerAppointmentReminders() {
  return inngest.send({
    name: Events.APPOINTMENT_REMINDER,
    data: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify appointment created
 */
export async function notifyAppointmentCreated(data: {
  appointmentId: string;
  patientId: string;
  organizationId: string;
}) {
  return inngest.send({
    name: Events.APPOINTMENT_CREATED,
    data,
  });
}

/**
 * Notify appointment cancelled
 */
export async function notifyAppointmentCancelled(data: {
  appointmentId: string;
  patientId: string;
  organizationId: string;
}) {
  return inngest.send({
    name: Events.APPOINTMENT_CANCELLED,
    data,
  });
}

// ============================================================================
// AI HELPERS
// ============================================================================

/**
 * Generate AI insights for a patient
 */
export async function generatePatientInsights(data: {
  patientId: string;
  organizationId: string;
}) {
  return inngest.send({
    name: Events.AI_PATIENT_INSIGHTS,
    data,
  });
}

/**
 * Generate AI insights for multiple patients
 */
export async function generateBatchPatientInsights(data: {
  organizationId: string;
  patientIds: string[];
}) {
  return inngest.send({
    name: 'ai/batch.insights',
    data,
  });
}

// ============================================================================
// CRON HELPERS
// ============================================================================

/**
 * Trigger cleanup workflow manually
 */
export async function triggerCleanup() {
  return inngest.send({
    name: Events.CRON_DAILY_CLEANUP,
    data: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Trigger birthday messages manually
 */
export async function triggerBirthdayMessages() {
  return inngest.send({
    name: Events.CRON_BIRTHDAY_MESSAGES,
    data: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Trigger daily reports manually
 */
export async function triggerDailyReports() {
  return inngest.send({
    name: Events.CRON_DAILY_REPORTS,
    data: {
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================================================
// EXPORT ALL HELPERS
// ============================================================================

export const InngestHelpers = {
  // Notifications
  sendNotification,
  sendBulkNotifications,
  // Email
  sendEmail,
  sendBulkEmails,
  // WhatsApp
  sendWhatsApp,
  sendBulkWhatsApp,
  // Appointments
  triggerAppointmentReminders,
  notifyAppointmentCreated,
  notifyAppointmentCancelled,
  // AI
  generatePatientInsights,
  generateBatchPatientInsights,
  // Cron
  triggerCleanup,
  triggerBirthdayMessages,
  triggerDailyReports,
};
