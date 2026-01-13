/**
 * Email Workflow
 *
 * Handles email sending via Resend with retry logic
 * Uses the ResendService for templates and rendering
 */

import { inngest, retryConfig } from '@/lib/inngest/client';
import { Events, EmailSendPayload } from '@/lib/inngest/types';
import { ResendService } from '@/lib/email';

export const sendEmailWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-send-email',
    name: 'Send Email',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.EMAIL_SEND,
  },
  async ({ event, step }: { event: { data: EmailSendPayload }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const { to, subject, html, text, from, replyTo, tags } = event.data;

    const result = await step.run('send-email', async () => {
      return await ResendService.sendEmail({
        to,
        subject,
        html,
        text,
        from,
        replyTo,
        tags,
      });
    });

    return {
      success: result.success,
      timestamp: new Date().toISOString(),
      to,
      messageId: result.messageId,
      error: result.error,
    };
  }
);

/**
 * Send appointment confirmation email workflow
 */
export const sendAppointmentConfirmationWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-appointment-confirmation',
    name: 'Send Appointment Confirmation Email',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: 'email/appointment.confirmation',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const { to, patientName, therapistName, date, time, location, onlineMeetingUrl, organizationName } = event.data;

    const result = await step.run('send-confirmation', async () => {
      return await ResendService.sendAppointmentConfirmation(
        to,
        {
          patientName,
          therapistName,
          date,
          time,
          location,
          onlineMeetingUrl,
          organizationName,
        },
        organizationName
      );
    });

    return {
      success: result.success,
      timestamp: new Date().toISOString(),
      to,
      messageId: result.messageId,
      error: result.error,
    };
  }
);

/**
 * Send appointment reminder email workflow
 */
export const sendAppointmentReminderEmailWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-appointment-reminder-email',
    name: 'Send Appointment Reminder Email',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: 'email/appointment.reminder',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const { to, patientName, therapistName, date, time, location, organizationName } = event.data;

    const result = await step.run('send-reminder', async () => {
      return await ResendService.sendAppointmentReminder(
        to,
        {
          patientName,
          therapistName,
          date,
          time,
          location,
          organizationName,
        },
        organizationName
      );
    });

    return {
      success: result.success,
      timestamp: new Date().toISOString(),
      to,
      messageId: result.messageId,
      error: result.error,
    };
  }
);

/**
 * Send birthday greeting email workflow
 */
export const sendBirthdayGreetingWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-birthday-greeting',
    name: 'Send Birthday Greeting Email',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: 'email/birthday.greeting',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const { to, patientName, organizationName, therapistName } = event.data;

    const result = await step.run('send-birthday-greeting', async () => {
      return await ResendService.sendBirthdayGreeting(
        to,
        {
          patientName,
          organizationName,
          therapistName,
        },
        organizationName
      );
    });

    return {
      success: result.success,
      timestamp: new Date().toISOString(),
      to,
      messageId: result.messageId,
      error: result.error,
    };
  }
);

/**
 * Send daily report email workflow
 */
export const sendDailyReportWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-daily-report',
    name: 'Send Daily Report Email',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: 'email/daily.report',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const {
      to,
      therapistName,
      organizationName,
      date,
      totalSessions,
      completedSessions,
      cancelledSessions,
      newPatients,
    } = event.data;

    const result = await step.run('send-daily-report', async () => {
      return await ResendService.sendDailyReport(
        to,
        {
          therapistName,
          organizationName,
          date,
          totalSessions,
          completedSessions,
          cancelledSessions,
          newPatients,
        },
        organizationName
      );
    });

    return {
      success: result.success,
      timestamp: new Date().toISOString(),
      to,
      messageId: result.messageId,
      error: result.error,
    };
  }
);

/**
 * Batch email sending workflow
 */
export const sendEmailBatchWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-send-email-batch',
    name: 'Send Batch Emails',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.EMAIL_SEND_BATCH,
  },
  async ({ event, step }: { event: { data: { emails: EmailSendPayload[] } }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const { emails } = event.data;

    const results = await step.run('send-batch', async () => {
      // Process emails in batches of 50 (Resend rate limit consideration)
      const batchSize = 50;
      const batches: EmailSendPayload[][] = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        batches.push(emails.slice(i, i + batchSize));
      }

      const allResults: unknown[] = [];

      for (const batch of batches) {
        // Send individual email events
        const events = batch.map((email) => ({
          name: Events.EMAIL_SEND,
          data: email,
        }));

        await inngest.send(events);
        allResults.push({ batchProcessed: batch.length });

        // Small delay between batches to avoid rate limiting
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return allResults;
    });

    return {
      success: true,
      totalQueued: emails.length,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);
