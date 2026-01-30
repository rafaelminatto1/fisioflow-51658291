/**
 * Cloud Trace Integration
 * Integrates with Google Cloud Trace for distributed tracing
 */

import { getLogger } from './logger';

const logger = getLogger('cloud-trace');

/**
 * Trace context extracted from headers
 */
export interface TraceContext {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  traceSampled?: boolean;
}

/**
 * Trace header names
 */
const TRACE_HEADERS = {
  TRACE_PARENT: 'traceparent',
  CLOUD_TRACE_CONTEXT: 'x-cloud-trace-context',
} as const;

/**
 * Extracts trace context from HTTP headers
 *
 * @param headers - HTTP request headers
 * @returns Trace context
 */
export function extractTraceContext(
  headers: { get?: (key: string) => string | null } | Record<string, string | undefined>
): TraceContext {
  const context: TraceContext = {};

  // Try W3C traceparent header (standard format)
  const traceParent = typeof headers.get === 'function'
    ? headers.get(TRACE_HEADERS.TRACE_PARENT)
    : (headers as Record<string, string | undefined>)[TRACE_HEADERS.TRACE_PARENT];

  if (traceParent) {
    // traceparent format: version-traceId-spanId-flags
    // Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
    const parts = traceParent.split('-');
    if (parts.length >= 3) {
      context.traceId = parts[1];
      context.spanId = parts[2];
      context.traceSampled = parts.length > 3 ? parts[3][0] === '1' : undefined;
    }
  }

  // Try Cloud Trace context header (GCP specific)
  const cloudTrace = typeof headers.get === 'function'
    ? headers.get(TRACE_HEADERS.CLOUD_TRACE_CONTEXT)
    : (headers as Record<string, string | undefined>)[TRACE_HEADERS.CLOUD_TRACE_CONTEXT];

  if (cloudTrace && !context.traceId) {
    // Format: traceId/spanId;o=1
    const match = cloudTrace.match(/^([a-f0-9]+)(?:\/([a-f0-9]+))?(?:;o=(\d))?/);
    if (match) {
      context.traceId = match[1];
      context.spanId = match[2];
      context.traceSampled = match[3] === '1';
    }
  }

  return context;
}

/**
 * Generates a new trace ID
 *
 * @returns Random trace ID (16 bytes, hex encoded)
 */
export function generateTraceId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

/**
 * Generates a new span ID
 *
 * @returns Random span ID (8 bytes, hex encoded)
 */
export function generateSpanId(): string {
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

/**
 * Creates a W3C traceparent header value
 *
 * @param traceId - Trace ID
 * @param spanId - Span ID
 * @param sampled - Whether to sample this trace
 * @returns Formatted traceparent header value
 */
export function createTraceParentHeader(
  traceId: string,
  spanId?: string,
  sampled?: boolean
): string {
  const span = spanId || generateSpanId();
  const flags = sampled ? '01' : '00';
  return `00-${traceId}-${span}-${flags}`;
}

/**
 * Creates a Cloud Trace context header value
 *
 * @param traceId - Trace ID
 * @param spanId - Span ID
 * @param sampled - Whether to sample this trace
 * @returns Formatted Cloud Trace context header value
 */
export function createCloudTraceContextHeader(
  traceId: string,
  spanId?: string,
  sampled?: boolean
): string {
  const span = spanId || generateSpanId();
  const sampledFlag = sampled ? ';o=1' : '';
  return `${traceId}/${span}${sampledFlag}`;
}

/**
 * Gets the URL for viewing a trace in Cloud Console
 *
 * @param projectId - Google Cloud project ID
 * @param traceId - Trace ID
 * @returns URL to trace in Cloud Console
 */
export function getTraceViewerUrl(projectId: string, traceId: string): string {
  return `https://console.cloud.google.com/traces/list?project=${projectId}&t=${traceId}`;
}

/**
 * Adds trace context to log entry
 *
 * @param logData - Log entry data
 * @param traceContext - Trace context
 * @returns Enhanced log entry with trace information
 */
export function addTraceToLog<T extends Record<string, any>>(
  logData: T,
  traceContext: TraceContext
): T & {
  'logging.googleapis.com/trace': string;
  'logging.googleapis.com/spanId'?: string;
  'logging.googleapis.com/trace_sampled'?: boolean;
} {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
  const enhanced: any = { ...logData };

  if (traceContext.traceId && projectId) {
    enhanced['logging.googleapis.com/trace'] = `projects/${projectId}/traces/${traceContext.traceId}`;
  }

  if (traceContext.spanId) {
    enhanced['logging.googleapis.com/spanId'] = traceContext.spanId;
  }

  if (traceContext.traceSampled !== undefined) {
    enhanced['logging.googleapis.com/trace_sampled'] = traceContext.traceSampled;
  }

  return enhanced;
}

/**
 * Creates a span wrapper for database operations
 */
export interface SpanOptions {
  name: string;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Executes a function within a trace span
 *
 * @param options - Span options
 * @param fn - Function to execute within the span
 * @returns Result of the function
 */
export async function withSpan<T>(
  options: SpanOptions,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const spanId = generateSpanId();

  logger.debug(`[Span:${options.name}] Started`, {
    span_id: spanId,
    attributes: options.attributes,
  });

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logger.debug(`[Span:${options.name}] Completed`, {
      span_id: spanId,
      duration_ms: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`[Span:${options.name}] Failed`, {
      span_id: spanId,
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Creates a database operation span
 */
export async function withDatabaseSpan<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    {
      name: 'database_query',
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'db.system': 'postgresql',
      },
    },
    fn
  );
}

/**
 * Creates an external API call span
 */
export async function withExternalServiceSpan<T>(
  serviceName: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    {
      name: 'external_api_call',
      attributes: {
        'service.name': serviceName,
        'http.method': operation,
      },
    },
    fn
  );
}

/**
 * Trace manager for correlating logs across function calls
 */
export class TraceManager {
  private traceId: string;
  private rootSpanId: string;
  private spans: Map<string, { startTime: number; endTime?: number; parent?: string }>;

  constructor(traceId?: string) {
    this.traceId = traceId || generateTraceId();
    this.rootSpanId = generateSpanId();
    this.spans = new Map();
  }

  /**
   * Gets the current trace ID
   */
  getTraceId(): string {
    return this.traceId;
  }

  /**
   * Gets the root span ID
   */
  getRootSpanId(): string {
    return this.rootSpanId;
  }

  /**
   * Creates a new child span
   */
  createChildSpan(name: string, parentSpanId?: string): string {
    const spanId = generateSpanId();
    this.spans.set(spanId, {
      startTime: Date.now(),
      parent: parentSpanId || this.rootSpanId,
    });

    logger.debug(`[Trace:${this.traceId}] Span created`, {
      span_name: name,
      span_id: spanId,
      parent_span_id: parentSpanId || this.rootSpanId,
    });

    return spanId;
  }

  /**
   * Closes a span
   */
  closeSpan(spanId: string): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      const duration = span.endTime - span.startTime;

      logger.debug(`[Trace:${this.traceId}] Span closed`, {
        span_id: spanId,
        duration_ms: duration,
      });
    }
  }

  /**
   * Gets trace context for logging
   */
  getTraceContext(): TraceContext {
    return {
      traceId: this.traceId,
      spanId: this.rootSpanId,
    };
  }

  /**
   * Gets trace viewer URL
   */
  getViewerUrl(projectId: string): string {
    return getTraceViewerUrl(projectId, this.traceId);
  }

  /**
   * Gets all active spans
   */
  getActiveSpans(): Array<{ id: string; duration: number }> {
    const now = Date.now();
    const active: Array<{ id: string; duration: number }> = [];

    for (const [id, span] of this.spans.entries()) {
      if (!span.endTime) {
        active.push({ id, duration: now - span.startTime });
      }
    }

    return active;
  }

  /**
   * Closes all active spans
   */
  closeAll(): void {
    const now = Date.now();

    for (const [id, span] of this.spans.entries()) {
      if (!span.endTime) {
        span.endTime = now;
        const duration = span.endTime - span.startTime;

        logger.debug(`[Trace:${this.traceId}] Auto-closing span`, {
          span_id: id,
          duration_ms: duration,
        });
      }
    }
  }
}

/**
 * Creates a trace manager from request headers
 */
export function createTraceFromRequest(
  headers: { get?: (key: string) => string | null } | Record<string, string | undefined>
): TraceManager {
  const context = extractTraceContext(headers);
  return new TraceManager(context.traceId);
}
