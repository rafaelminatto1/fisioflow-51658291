/**
 * Inngest Serve Handler
 *
 * This file sets up the Inngest API route for Vercel.
 * It registers all Inngest functions and handles incoming events.
 */

import { serve } from 'inngest';
import { inngest } from './client.js';

// Import all workflows
import { cleanupWorkflow } from '../../inngest/workflows/cleanup.js';
import { birthdayMessagesWorkflow } from '../../inngest/workflows/birthdays.js';
import { dailyReportsWorkflow } from '../../inngest/workflows/daily-reports.js';
import { weeklySummaryWorkflow } from '../../inngest/workflows/weekly-summary.js';
import { expiringVouchersWorkflow } from '../../inngest/workflows/expiring-vouchers.js';
import { dataIntegrityWorkflow } from '../../inngest/workflows/data-integrity.js';
import { sendNotificationWorkflow } from '../../inngest/workflows/notifications.js';
import {
  sendEmailWorkflow,
  sendAppointmentConfirmationWorkflow,
  sendAppointmentReminderEmailWorkflow,
  sendBirthdayGreetingWorkflow,
  sendDailyReportWorkflow,
  sendEmailBatchWorkflow,
} from '../../inngest/workflows/email.js';
import {
  sendWhatsAppWorkflow,
  sendAppointmentConfirmationWhatsAppWorkflow,
  sendAppointmentReminderWhatsAppWorkflow,
  sendBirthdayGreetingWhatsAppWorkflow,
  sendWhatsAppBatchWorkflow,
} from '../../inngest/workflows/whatsapp.js';
import {
  appointmentReminderWorkflow,
  appointmentCreatedWorkflow,
} from '../../inngest/workflows/appointments.js';
import {
  aiPatientInsightsWorkflow,
  aiBatchInsightsWorkflow,
} from '../../inngest/workflows/ai-insights.js';

// Export the Inngest handler for Vercel
export const { GET, POST, OPTIONS } = serve({
  client: inngest,
  functions: [
    // Cron/Scheduled workflows
    cleanupWorkflow,
    birthdayMessagesWorkflow,
    dailyReportsWorkflow,
    weeklySummaryWorkflow,
    expiringVouchersWorkflow,
    dataIntegrityWorkflow,

    // Notification workflows
    sendNotificationWorkflow,

    // Email workflows
    sendEmailWorkflow,
    sendAppointmentConfirmationWorkflow,
    sendAppointmentReminderEmailWorkflow,
    sendBirthdayGreetingWorkflow,
    sendDailyReportWorkflow,
    sendEmailBatchWorkflow,

    // WhatsApp workflows
    sendWhatsAppWorkflow,
    sendAppointmentConfirmationWhatsAppWorkflow,
    sendAppointmentReminderWhatsAppWorkflow,
    sendBirthdayGreetingWhatsAppWorkflow,
    sendWhatsAppBatchWorkflow,

    // Appointment workflows
    appointmentReminderWorkflow,
    appointmentCreatedWorkflow,

    // AI workflows
    aiPatientInsightsWorkflow,
    aiBatchInsightsWorkflow,
  ],
});

// Re-export for use in API route
export const runtime = 'edge';
