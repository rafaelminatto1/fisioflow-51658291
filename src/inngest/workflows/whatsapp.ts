/**
 * WhatsApp Workflow
 *
 * Handles WhatsApp message sending via Evolution API
 * Uses the WhatsAppService for templates and rendering
 */


/**
 * Send a single WhatsApp message
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, WhatsAppSendPayload, InngestStep } from '../../lib/inngest/types.js';
import { WhatsAppService } from '../../lib/whatsapp/index.js';

export const sendWhatsAppWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-send-whatsapp',
    name: 'Send WhatsApp Message',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    event: Events.WHATSAPP_SEND,
  },
  async ({ event, step }: { event: { data: WhatsAppSendPayload }; step: InngestStep }) => {
    const { to, message, type, mediaUrl, templateName, templateData } = event.data;

    const result = await step.run('send-whatsapp', async () => {
      switch (type) {
        case 'media':
          return await WhatsAppService.sendMedia(to, {
            url: mediaUrl || '',
            caption: message,
          });

        case 'template':
          return await WhatsAppService.sendTemplate(
            to,
            templateName || '',
            templateData || {}
          );

        default:
          return await WhatsAppService.sendText(to, message);
      }
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
 * Send appointment confirmation WhatsApp workflow
 */
export const sendAppointmentConfirmationWhatsAppWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-appointment-confirmation-whatsapp',
    name: 'Send Appointment Confirmation WhatsApp',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    event: 'whatsapp/appointment.confirmation',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { to, patientName, therapistName, date, time, location, organizationName } = event.data;

    const result = await step.run('send-confirmation', async () => {
      return await WhatsAppService.sendAppointmentConfirmation(to as string, {
        patientName: patientName as string,
        therapistName: therapistName as string,
        date: date as string,
        time: time as string,
        location: location as string | undefined,
        organizationName: organizationName as string,
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
 * Send appointment reminder WhatsApp workflow
 */
export const sendAppointmentReminderWhatsAppWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-appointment-reminder-whatsapp',
    name: 'Send Appointment Reminder WhatsApp',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    event: 'whatsapp/appointment.reminder',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { to, patientName, therapistName, date, time, location, organizationName } = event.data;

    const result = await step.run('send-reminder', async () => {
      return await WhatsAppService.sendAppointmentReminder(to as string, {
        patientName: patientName as string,
        therapistName: therapistName as string,
        date: date as string,
        time: time as string,
        location: location as string | undefined,
        organizationName: organizationName as string,
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
 * Send birthday greeting WhatsApp workflow
 */
export const sendBirthdayGreetingWhatsAppWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-birthday-greeting-whatsapp',
    name: 'Send Birthday Greeting WhatsApp',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    event: 'whatsapp/birthday.greeting',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { to, patientName, organizationName, therapistName } = event.data;

    const result = await step.run('send-birthday-greeting', async () => {
      return await WhatsAppService.sendBirthdayGreeting(to as string, {
        patientName: patientName as string,
        organizationName: organizationName as string,
        therapistName: therapistName as string | undefined,
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
 * Send reactivation WhatsApp workflow
 */
export const sendReactivationWhatsAppWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-reactivation-whatsapp',
    name: 'Send Reactivation WhatsApp',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    event: 'whatsapp/reactivation',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { to, patientName, organizationName } = event.data;

    const result = await step.run('send-reactivation', async () => {
      return await WhatsAppService.sendReactivation(to as string, {
        patientName: patientName as string,
        organizationName: organizationName as string,
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
 * Batch WhatsApp sending workflow
 */
export const sendWhatsAppBatchWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-send-whatsapp-batch',
    name: 'Send Batch WhatsApp Messages',
    retries: retryConfig.whatsapp.maxAttempts,
  },
  {
    event: Events.WHATSAPP_SEND_BATCH,
  },
  async ({ event, step }: { event: { data: { messages: WhatsAppSendPayload[] } }; step: InngestStep }) => {
    const { messages } = event.data;

    const results = await step.run('send-batch', async () => {
      // Process messages in batches with throttling
      const batchSize = 10; // 10 messages per batch
      const batches: WhatsAppSendPayload[][] = [];

      for (let i = 0; i < messages.length; i += batchSize) {
        batches.push(messages.slice(i, i + batchSize));
      }

      const allResults: unknown[] = [];

      for (const batch of batches) {
        // Send individual message events
        const events = batch.map((message) => ({
          name: Events.WHATSAPP_SEND,
          data: message,
        }));

        await inngest.send(events);
        allResults.push({ batchProcessed: batch.length });

        // Delay between batches to avoid rate limiting (1 second)
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return allResults;
    });

    return {
      success: true,
      totalQueued: messages.length,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);
