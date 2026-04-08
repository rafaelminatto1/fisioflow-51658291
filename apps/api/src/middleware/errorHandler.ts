import { logToAxiom } from '../lib/axiom';
import { QueryTimeoutError, DatabaseError } from '../lib/dbWrapper';
import type { CustomContext } from './requestId';

export enum ErrorType {
  DATABASE = 'DATABASE_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  AUTH = 'AUTH_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL_ERROR',
}

export interface AppError extends Error {
  type: ErrorType;
  statusCode: number;
  details?: any;
  requestId?: string;
}

export class AppErrorImpl extends Error implements AppError {
  type: ErrorType;
  statusCode: number;
  details?: any;
  requestId?: string;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export function classifyError(error: Error): AppError {
  if (error instanceof QueryTimeoutError) {
    return new AppErrorImpl(
      ErrorType.TIMEOUT,
      'Database query timed out. Please try again.',
      504,
      {
        timeout: error.timeout,
        query: error.query,
      }
    );
  }

  if (error instanceof DatabaseError) {
    return new AppErrorImpl(
      ErrorType.DATABASE,
      'Database operation failed. Please try again.',
      500,
      {
        originalError: error.originalError.message,
        query: error.query,
      }
    );
  }

  if (error.message.includes('JWT') || error.message.includes('token')) {
    return new AppErrorImpl(
      ErrorType.AUTH,
      'Authentication failed. Please log in again.',
      401,
      { reason: error.message }
    );
  }

  if (error.message.includes('not found') || error.message.includes('does not exist')) {
    return new AppErrorImpl(
      ErrorType.NOT_FOUND,
      error.message,
      404
    );
  }

  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return new AppErrorImpl(
      ErrorType.VALIDATION,
      error.message,
      400
    );
  }

  return new AppErrorImpl(
    ErrorType.INTERNAL,
    'An unexpected error occurred. Please try again.',
    500,
    { originalError: error.message }
  );
}

export async function errorHandler(err: Error, c: CustomContext) {
  const requestId = c.get('requestId') || 'unknown';
  const appError = classifyError(err);
  appError.requestId = requestId;

  const requestOrigin = c.req.header('Origin');
  
  const allowedOrigins = (c.env as any).ALLOWED_ORIGINS
    ? String((c.env as any).ALLOWED_ORIGINS).split(',').map((o: string) => o.trim())
    : [];
    
  const isAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);
  const origin = isAllowed && requestOrigin ? requestOrigin : allowedOrigins[0];

  const isProduction = c.env.ENVIRONMENT === 'production';
  const isDev = c.env.ENVIRONMENT === 'development';

  const errorResponse: any = {
    error: appError.type,
    message: appError.message,
    requestId: requestId,
  };

  if (isDev || !isProduction) {
    errorResponse.details = appError.details;
    errorResponse.stack = err.stack;
  }

  if (appError.statusCode >= 500) {
    console.error(`[ERROR] Request ${requestId}:`, {
      type: appError.type,
      message: appError.message,
      statusCode: appError.statusCode,
      details: appError.details,
      stack: err.stack,
    });

    if (c.env.AXIOM_TOKEN) {
      logToAxiom(c.env, c.executionCtx, {
        level: 'error',
        message: `[${appError.type}] ${appError.message}`,
        requestId,
        errorType: appError.type,
        statusCode: appError.statusCode,
        path: c.req.path,
        method: c.req.method,
        userAgent: c.req.header('User-Agent'),
        details: appError.details,
        stack: isProduction ? undefined : err.stack,
      });
    }
  }

  return c.json(errorResponse, appError.statusCode as any, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'X-Request-ID': requestId,
  });
}
