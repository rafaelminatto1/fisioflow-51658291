/**
 * Sentry Error Handler Middleware
 * Wrapper for Cloud Functions to capture errors in Sentry
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { AuthContext } from './auth';
import {
  isSentryConfigured,
  withSentryTracking,
  setSentryUser,
  clearSentryUser,
  captureSentryException,
  setSentryTags,
  setSentryContext,
} from '../lib/sentry';
import { getLogger } from '../lib/logger';

const logger = getLogger('sentry-middleware');

/**
 * Configuration for sentry wrapper
 */
export interface SentryWrapperOptions {
  functionName: string;
  operation?: string;
  captureAuthErrors?: boolean;
  captureValidationErrors?: boolean;
  captureNotFoundErrors?: boolean;
}

/**
 * Wraps an onCall handler with Sentry error tracking
 *
 * @param handler - The function handler to wrap
 * @param options - Sentry wrapper options
 * @returns Wrapped handler
 */
export function withSentryErrorHandler<T extends any[], R>(
  handler: (data: T[0], auth?: AuthContext) => Promise<R>,
  options: SentryWrapperOptions
) {
  return async (data: T[0], auth?: AuthContext): Promise<R> => {
    if (!isSentryConfigured()) {
      return handler(data, auth);
    }

    logger.debug('Sentry error handler active', {
      function: options.functionName,
      operation: options.operation,
    });

    // Set user context
    if (auth) {
      setSentryUser(auth);
    }

    // Set function context
    setSentryContext('cloud_function', {
      name: options.functionName,
      operation: options.operation,
    });

    // Set environment tags
    setSentryTags({
      function_name: options.functionName,
      region: process.env.FUNCTION_REGION || 'unknown',
      memory: process.env.FUNCTION_MEMORY_MB || 'unknown',
    });

    try {
      return await handler(data, auth);
    } catch (error) {
      // Check if we should skip this error type
      if (error instanceof HttpsError) {
        if (
          (error.code === 'unauthenticated' && !options.captureAuthErrors) ||
          (error.code === 'invalid-argument' && !options.captureValidationErrors) ||
          (error.code === 'not-found' && !options.captureNotFoundErrors)
        ) {
          logger.debug('Skipping Sentry capture for expected error', {
            code: error.code,
          });
          clearSentryUser();
          throw error;
        }
      }

      // Capture exception
      captureSentryException(error as Error, {
        user: auth,
        tags: {
          function: options.functionName,
          operation: options.operation || 'unknown',
        },
        extra: {
          requestData: data,
        },
      });

      throw error;
    } finally {
      clearSentryUser();
    }
  };
}

/**
 * Creates a wrapped onCall function with Sentry
 *
 * @param functionName - Name of the function
 * @param handler - The function handler
 * @param options - Optional onCall options
 * @returns Wrapped onCall function
 */
export function onCallWithSentry<T = any, R = any>(
  functionName: string,
  handler: (data: T, auth?: AuthContext) => Promise<R>,
  options?: any
) {
  return onCall<T, Promise<R>>(options, async (request) => {
    const wrappedHandler = withSentryErrorHandler(handler, {
      functionName,
    });

    // Extract auth from request
    const auth = request.auth as any;
    const authContext: AuthContext | undefined = auth
      ? {
          userId: auth.uid || auth.token?.user_id,
          organizationId: auth.token?.organization_id,
          role: auth.token?.role,
          email: auth.token?.email,
          profileId: auth.token?.profile_id,
        }
      : undefined;

    return wrappedHandler(request.data, authContext);
  });
}

/**
 * Higher-order function for Sentry-wrapped handlers
 * Use this to wrap your existing handlers
 *
 * @param functionName - Name of the function for Sentry
 * @returns A function that accepts and wraps a handler
 */
export function createSentryWrapper(functionName: string) {
  return <T extends any[], R>(
    handler: (data: T[0], auth?: AuthContext) => Promise<R>
  ) => {
    return withSentryTracking(handler, {
      functionName,
      getAuth: (data: T[0]) => {
        // Auth will be set by the actual function call
        return undefined;
      },
    });
  };
}

/**
 * Decorator for class methods (if using classes)
 * Note: TypeScript experimental decorators required
 */
export function SentryCapture(functionName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!isSentryConfigured()) {
        return originalMethod.apply(this, args);
      }

      setSentryTags({
        class: target.constructor.name,
        method: propertyKey,
      });

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        captureSentryException(error as Error, {
          tags: {
            class: target.constructor.name,
            method: propertyKey,
          },
          extra: {
            args: JSON.stringify(args),
          },
        });
        throw error;
      }
    };

    return descriptor;
  };
}
