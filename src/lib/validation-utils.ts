/**
 * Validation Utilities
 *
 * @description
 * Helper functions for runtime validation using Zod schemas.
 * Provides convenient wrappers for common validation patterns.
 *
 * @module lib/validation-utils
 */

import { z } from 'zod';
import type { UnknownError, getErrorMessage, asError } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Safe parse wrapper that returns null on validation failure
 * Useful for optional data that may not always be present
 */
export function validateOrNull<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: string
): T | null {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    if (context) {
      logger.warn(`Validation failed in ${context}`, { errors: result.error.errors }, 'Validation');
    }
    return null;
  } catch (error) {
    if (context) {
      logger.error(`Error validating ${context}`, error, 'Validation');
    }
    return null;
  }
}

/**
 * Safe parse wrapper that returns a default value on validation failure
 */
export function validateOrDefault<T>(
  schema: z.ZodType<T>,
  data: unknown,
  defaultValue: T,
  context?: string
): T {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    if (context) {
      logger.warn(`Validation failed in ${context}, using default`, { errors: result.error.errors }, 'Validation');
    }
    return defaultValue;
  } catch (error) {
    if (context) {
      logger.error(`Error validating ${context}, using default`, error, 'Validation');
    }
    return defaultValue;
  }
}

/**
 * Safe parse wrapper that throws a formatted error on validation failure
 * Use for critical data that must be valid
 */
export function validateOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  errorMessage?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = errorMessage || `Validation failed: ${result.error.errors.map(e => e.message).join(', ')}`;
    throw new Error(message);
  }
  return result.data;
}

/**
 * Validate an array of items, filtering out invalid ones
 * Returns only the items that pass validation
 */
export function validateArray<T>(
  schema: z.ZodType<T>,
  items: unknown[],
  context?: string
): T[] {
  const validItems: T[] = [];
  const invalidIndices: number[] = [];

  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      validItems.push(result.data);
    } else {
      invalidIndices.push(index);
    }
  });

  if (invalidIndices.length > 0 && context) {
    logger.warn(
      `Filtered ${invalidIndices.length} invalid items from ${context}`,
      { invalidIndices },
      'Validation'
    );
  }

  return validItems;
}

/**
 * Validate API response data
 * Wraps fetch response parsing with validation
 */
export async function validateApiResponse<T>(
  schema: z.ZodType<T>,
  response: Response,
  context?: string
): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const rawData = await response.json();

  const result = schema.safeParse(rawData);
  if (!result.success) {
    const message = context
      ? `Invalid API response for ${context}`
      : 'Invalid API response';
    logger.error(
      message,
      { errors: result.error.errors, rawData },
      'Validation'
    );
    throw new Error(`${message}: ${result.error.errors.map(e => e.message).join(', ')}`);
  }

  return result.data;
}

/**
 * Type guard to check if data matches schema
 */
export function matchesSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): data is T {
  const result = schema.safeParse(data);
  return result.success;
}

/**
 * Validate and transform data using a schema
 * Returns both the validated data and any validation errors
 */
export function validateWithErrors<T>(
  schema: z.ZodType<T>,
  data: unknown
): { data: T | null; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { data: result.data, errors: [] };
  }

  const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  return { data: null, errors };
}

/**
 * Parse and validate URL query parameters
 */
export function validateQueryParams<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  searchParams: URLSearchParams
): T | null {
  const params: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    // Try to parse as number, boolean, or string
    if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else if (/^\d+$/.test(value)) {
      params[key] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      params[key] = parseFloat(value);
    } else {
      params[key] = value;
    }
  }

  return validateOrNull(schema, params, 'query params');
}

/**
 * Create a validator for a specific schema with context
 * Returns a reusable validation function
 */
export function createValidator<T>(
  schema: z.ZodType<T>,
  context: string
): {
  validateOrNull: (data: unknown) => T | null;
  validateOrDefault: (data: unknown, defaultValue: T) => T;
  validateOrThrow: (data: unknown) => T;
  validateArray: (items: unknown[]) => T[];
} {
  return {
    validateOrNull: (data: unknown) => validateOrNull(schema, data, context),
    validateOrDefault: (data: unknown, defaultValue: T) =>
      validateOrDefault(schema, data, defaultValue, context),
    validateOrThrow: (data: unknown) => validateOrThrow(schema, data, context),
    validateArray: (items: unknown[]) => validateArray(schema, items, context),
  };
}

/**
 * Validate form data on change
 * Useful for real-time form validation
 */
export function validateFormField<T>(
  schema: z.ZodType<T>,
  field: keyof T,
  value: unknown,
  currentData: Partial<T>
): { valid: boolean; errors: string[]; data: Partial<T> } {
  const newData = { ...currentData, [field]: value };

  const result = schema.safeParse(newData);

  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }

  // Filter errors to only those related to this field
  const fieldErrors = result.error.errors
    .filter(e => e.path.length > 0 && e.path[0] === field)
    .map(e => e.message);

  return {
    valid: fieldErrors.length === 0,
    errors: fieldErrors,
    data: newData,
  };
}

/**
 * Debounced validation for search inputs
 */
export function createDebouncedValidator<T>(
  schema: z.ZodType<T>,
  delay: number = 300
): (value: unknown) => Promise<{ valid: boolean; errors: string[]; data?: T }> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (value: unknown): Promise<{ valid: boolean; errors: string[]; data?: T }> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const result = schema.safeParse(value);

        if (result.success) {
          resolve({ valid: true, errors: [], data: result.data });
        } else {
          resolve({
            valid: false,
            errors: result.error.errors.map(e => e.message),
          });
        }
      }, delay);
    });
  };
}

/**
 * Validate environment variables at runtime
 */
export function validateEnvVars<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  env: Record<string, string | undefined> = process.env
): T {
  const result = schema.safeParse(env);

  if (!result.success) {
    const missingVars = result.error.errors
      .filter(e => e.code === 'invalid_type')
      .map(e => e.path.join('.'));

    throw new Error(
      `Invalid environment variables:\n${result.error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n')}`
    );
  }

  return result.data;
}

/**
 * Type-safe error handler for API responses
 */
export function handleApiError(error: UnknownError): { message: string; code?: string } {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : 'An unknown error occurred';

  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;

  return { message, code };
}
