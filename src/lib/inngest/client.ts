/**
 * Inngest Client Configuration
 *
 * Centralized Inngest client setup for FisioFlow
 */


/**
 * Create Inngest client with proper configuration
 *
 * In development, this will use the Inngest Dev Server
 * In production, it connects to Inngest Cloud
 */

import { Inngest } from 'inngest';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const inngest = new Inngest({
  id: 'fisioflow',
  name: 'FisioFlow',
  // The INNGEST_KEY is automatically detected by the SDK:
  // - Development: Uses INNGEST_DEV environment variable
  // - Production: Uses INNGEST_KEY from environment variables
});

/**
 * Inngest middleware for logging
 */
export const loggerMiddleware = {
  onFunctionRun: ({ ctx, fn }: { ctx: { runId: string; event: { id: string } }; fn: { name: string } }) => {
    return {
      transformOutput: (output: unknown) => {
        logger.info(`[Inngest] Function ${fn.name} completed`, {
          runId: ctx.runId,
          eventId: ctx.event.id,
        }, 'inngest');
        return output;
      },
    };
  },
};

/**
 * Inngest middleware for error tracking with Sentry
 */
export const errorTrackingMiddleware = {
  onFunctionRun: ({ fn }: { fn: { name: string } }) => {
    return {
      transformOutput: (output: unknown) => {
        if (output && typeof output === 'object' && output.error) {
          // Import Sentry dynamically to avoid issues in non-Sentry environments
          import('@sentry/react').then((SentryModule) => {
            const Sentry = SentryModule as { captureException: (error: Error, context?: { tags?: Record<string, string> }) => void };
            if (typeof Sentry.captureException === 'function') {
              Sentry.captureException(output.error as Error, {
                tags: {
                  inngest_function: fn.name,
                  inngest_event: 'workflow',
                },
              });
            }
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
