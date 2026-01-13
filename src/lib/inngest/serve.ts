/**
 * Inngest Serve Handler
 *
 * This file sets up the Inngest API route for Vercel.
 * It registers all Inngest functions and handles incoming events.
 */

import { serve } from 'inngest/react';
import { inngest } from './client';

// Import all workflows
import { cleanupWorkflow } from '@/inngest/workflows/cleanup';
import { birthdayMessagesWorkflow } from '@/inngest/workflows/birthdays';
import { dailyReportsWorkflow } from '@/inngest/workflows/daily-reports';
import { weeklySummaryWorkflow } from '@/inngest/workflows/weekly-summary';
import { expiringVouchersWorkflow } from '@/inngest/workflows/expiring-vouchers';
import { dataIntegrityWorkflow } from '@/inngest/workflows/data-integrity';
import { sendNotificationWorkflow } from '@/inngest/workflows/notifications';
import { sendEmailWorkflow } from '@/inngest/workflows/email';
import { sendWhatsAppWorkflow } from '@/inngest/workflows/whatsapp';
import { appointmentReminderWorkflow } from '@/inngest/workflows/appointments';
import { aiPatientInsightsWorkflow } from '@/inngest/workflows/ai-insights';

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
    sendEmailWorkflow,
    sendWhatsAppWorkflow,

    // Appointment workflows
    appointmentReminderWorkflow,

    // AI workflows
    aiPatientInsightsWorkflow,
  ],
});

// Re-export for use in API route
export const runtime = 'edge';
