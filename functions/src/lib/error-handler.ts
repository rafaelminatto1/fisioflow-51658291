import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from './logger';
import { setCorsHeaders } from './cors';

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Maps Firebase HttpsError codes to HTTP status codes
 */
const ERROR_CODE_MAP: Record<string, number> = {
  'ok': 200,
  'cancelled': 499,
  'unknown': 500,
  'invalid-argument': 400,
  'deadline-exceeded': 504,
  'not-found': 404,
  'already-exists': 409,
  'permission-denied': 403,
  'resource-exhausted': 429,
  'failed-precondition': 400,
  'aborted': 409,
  'out-of-range': 400,
  'unimplemented': 501,
  'internal': 500,
  'unavailable': 503,
  'data-loss': 500,
  'unauthenticated': 401
};

/**
 * Centralized error handler for HTTP functions
 * Logs the error appropriately and sends a standardized JSON response
 */
export function handleApiError(
  error: unknown,
  req: any,
  res: any,
  context: string = 'ApiError'
) {
  // Ensure CORS headers are set (crucial for frontend error handling)
  setCorsHeaders(res, req);

  // Determine error details
  let statusCode = 500;
  let errorCode = 'internal';
  let errorMessage = 'An internal error occurred';
  let errorDetails: any = undefined;

  if (error instanceof HttpsError) {
    statusCode = ERROR_CODE_MAP[error.code] || 500;
    errorCode = error.code;
    errorMessage = error.message;
    errorDetails = error.details;

    // Log as warning for expected client errors, error for server errors
    if (statusCode >= 400 && statusCode < 500) {
      logger.warn(`${context}: ${error.code} - ${error.message}`, { details: error.details });
    } else {
      logger.error(`${context}: ${error.code} - ${error.message}`, error);
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
    // Log generic errors as errors
    logger.error(`${context}: ${error.message}`, error);
  } else {
    errorMessage = String(error);
    logger.error(`${context}: Unknown error`, { error });
  }

  // Send JSON response
  const response: ApiErrorResponse = {
    error: {
      code: errorCode,
      message: errorMessage,
      details: errorDetails
    }
  };

  // Only send response if headers haven't been sent yet
  if (!res.headersSent) {
    res.status(statusCode).json(response);
  }
}

/**
 * Higher-order function to wrap HTTP handlers with error handling and CORS
 */
export function withErrorHandling(
  handler: (req: any, res: any) => Promise<void>,
  contextName?: string
) {
  return async (req: any, res: any) => {
    // Ensure CORS headers are set for ALL requests (success or error)
    setCorsHeaders(res, req);

    try {
      // Handle preflight requests automatically
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      await handler(req, res);
    } catch (error) {
      handleApiError(error, req, res, contextName || 'FunctionHandler');
    }
  };
}
