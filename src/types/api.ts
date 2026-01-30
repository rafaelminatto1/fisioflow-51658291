/**
 * API Type Definitions
 *
 * @description
 * Type definitions for API responses, errors, and requests.
 * Use these types for all API interactions instead of `any`.
 *
 * @module types/api
 */

import type { Dictionary, JsonObject } from './common';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  meta?: ApiMeta;
}

/**
 * API metadata
 */
export interface ApiMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * API error types
 */
export type ApiErrorCode =
  | 'UNKNOWN_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE';

/**
 * API error response
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Dictionary;
  stack?: string; // Only in development
  timestamp: string;
  requestId?: string;
}

/**
 * API error class
 */
export class ApiException extends Error {
  constructor(
    public error: ApiError,
    public statusCode?: number
  ) {
    super(error.message);
    this.name = 'ApiException';
  }
}

/**
 * Firebase specific types
 */
export interface FirebaseError {
  code: string;
  message: string;
  name: string;
}

/**
 * Query builder types
 */
export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAfter' | 'startAt' | 'endBefore' | 'endAt';
  field?: string;
  operator?: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'array-contains-any' | 'in';
  value?: unknown;
}

/**
 * Batch operation types
 */
export interface BatchOperation<T = unknown> {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data?: T;
}

/**
 * Batch result
 */
export interface BatchResult {
  success: boolean;
  committed: boolean;
  count: number;
}

/**
 * Realtime event types
 */
export type RealtimeEventType = 'added' | 'modified' | 'removed';

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  data: T;
  id: string;
  timestamp: number;
}

/**
 * Upload progress types
 */
export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

/**
 * Upload task result
 */
export interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  fullPath: string;
  metadata: {
    name: string;
    size: number;
    contentType: string;
    timeCreated: string;
    updated: string;
  };
  error?: ApiError;
}

/**
 * Request types
 */
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  headers?: Dictionary<string>;
}

/**
 * Request result with retry info
 */
export interface RequestResult<T = unknown> {
  data: T;
  success: boolean;
  attempts: number;
  duration: number; // milliseconds
  fromCache: boolean;
}

/**
 * Cloud Functions callable types
 */
export interface CallableRequest<T = unknown> {
  data: T;
  auth?: {
    uid: string;
    token: JsonObject;
  };
}

export interface CallableResponse<T = unknown> {
  data: T;
}

/**
 * GraphQL types (if using GraphQL)
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Dictionary;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * WebSocket types
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  id?: string;
}

/**
 * Webhook types
 */
export interface WebhookPayload<T = Dictionary> {
  id: string;
  event: string;
  timestamp: string;
  data: T;
  signature?: string;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Validation error response
 */
export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR';
  details: {
    errors: ValidationErrorDetail[];
  };
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

/**
 * Response with rate limit headers
 */
export interface RateLimitedResponse<T = unknown> extends ApiResponse<T> {
  rateLimit?: RateLimitInfo;
}
