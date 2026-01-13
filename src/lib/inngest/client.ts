/**
 * Inngest Client Configuration
 *
 * Centralized Inngest client setup for FisioFlow
 */

import { Inngest } from 'inngest';

/**
 * Create Inngest client with proper configuration
 *
 * In development, this will use the Inngest Dev Server
 * In production, it connects to Inngest Cloud
 */
export const inngest = new Inngest({
  id: 'fisioflow',
  name: 'FisioFlow',
  // The INNGEST_KEY is automatically detected by the SDK:
  // - Development: Uses INNGEST_DEV_SERVER_URL if set
  // - Production: Uses INNGEST_KEY (from Vercel integration)
});

/**
 * Inngest middleware for logging
 */
export const loggerMiddleware = {
  onFunctionRun: ({ ctx, fn }) => {
    return {
      transformOutput: (output) => {
        console.log(`[Inngest] Function ${fn.name} completed`, {
          runId: ctx.runId,
          eventId: ctx.event.id,
        });
        return output;
      },
    };
  },
};

/**
 * Inngest middleware for error tracking with Sentry
 */
export const errorTrackingMiddleware = {
  onFunctionRun: ({ fn }) => {
    return {
      transformOutput: (output) => {
        if (output.error) {
          // Import Sentry dynamically to avoid issues in non-Sentry environments
          import('@sentry/react').then((Sentry) => {
            Sentry.captureException(output.error, {
              tags: {
                inngest_function: fn.name,
                inngest_event: 'workflow',
              },
            });
          });
        }
        return output;
      },
    };
  },
};

/**
 * Retry configuration for different types of operations
 */
export const retryConfig = {
  // For external API calls (OpenAI, Resend, etc.)
  api: {
    maxAttempts: 3,
    retry: {
      delay: 'exponential',
      initialDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
    },
  },

  // For database operations
  database: {
    maxAttempts: 5,
    retry: {
      delay: 'exponential',
      initialDelay: 500,
      maxDelay: 10000,
    },
  },

  // For WhatsApp notifications
  whatsapp: {
    maxAttempts: 3,
    retry: {
      delay: 'exponential',
      initialDelay: 2000,
      maxDelay: 60000,
    },
  },

  // For email notifications
  email: {
    maxAttempts: 3,
    retry: {
      delay: 'exponential',
      initialDelay: 2000,
      maxDelay: 60000,
    },
  },
} as const;

/**
 * Priority levels for workflow execution
 */
export const Priority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

export type PriorityLevel = typeof Priority[keyof typeof Priority];
