/**
 * Cloud Logging Integration
 *
 * Integrates with Google Cloud Logging for centralized log management
 *
 * @module lib/cloud-logging
 */

import { Logging } from '@google-cloud/logging';
import { getLogger, LogLevel } from './logger';

const logger = getLogger('cloud-logging');

// ============================================================================
// TYPES
// ============================================================================

export interface CloudLogOptions {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  traceId?: string;
  spanId?: string;
  labels?: Record<string, string>;
  jsonPayload?: Record<string, unknown>;
}

// ============================================================================
// SINGLETON CLIENT
// ============================================================================

let loggingClient: Logging | null = null;
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';

/**
 * Get or create Cloud Logging client (singleton)
 */
export function getLoggingClient(): Logging {
  if (!loggingClient) {
    loggingClient = new Logging({
      projectId: PROJECT_ID,
    });
    logger.info('Cloud Logging client initialized', { projectId: PROJECT_ID });
  }
  return loggingClient;
}

// ============================================================================
// LOG ENTRY CREATION
// ============================================================================

/**
 * Map our LogLevel to Cloud Logging severity
 */
function mapSeverity(level: LogLevel): string {
  const severityMap: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARNING',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.CRITICAL]: 'CRITICAL',
  };
  return severityMap[level] || 'DEFAULT';
}

/**
 * Write a structured log entry to Cloud Logging
 */
export async function writeLog(options: CloudLogOptions): Promise<void> {
  try {
    const client = getLoggingClient();
    const log = client.log('functions');

    // Build metadata with labels (only string values for labels)
    const labels: Record<string, string> = {
      function_name: process.env.FUNCTION_NAME || 'unknown',
      region: process.env.FUNCTION_REGION || 'southamerica-east1',
      ...options.labels,
    };
    if (process.env.FUNCTION_INVOCATION_ID) {
      labels.invocation_id = process.env.FUNCTION_INVOCATION_ID;
    }
    const metadata = {
      severity: options.severity,
      labels,
      trace: options.traceId
        ? `projects/${PROJECT_ID}/traces/${options.traceId}`
        : undefined,
      spanId: options.spanId,
    };

    // Build the log entry
    const logEntry = log.entry(metadata, {
      message: options.message,
      timestamp: new Date().toISOString(),
      ...options.jsonPayload,
    });

    // Write the log entry
    await log.write(logEntry);
  } catch (error) {
    // Fallback to console.log if Cloud Logging fails
    console.error(`[CloudLogging] Failed to write log:`, error);
    console.log(JSON.stringify(options));
  }
}

/**
 * Write multiple log entries in batch
 */
export async function writeLogBatch(entries: CloudLogOptions[]): Promise<void> {
  try {
    const client = getLoggingClient();
    const log = client.log('functions');

    const logEntries = entries.map((entry) => {
      const entryLabels: Record<string, string> = {
        function_name: process.env.FUNCTION_NAME || 'unknown',
        region: process.env.FUNCTION_REGION || 'southamerica-east1',
        ...entry.labels,
      };
      if (process.env.FUNCTION_INVOCATION_ID) {
        entryLabels.invocation_id = process.env.FUNCTION_INVOCATION_ID;
      }
      const metadata = {
        severity: entry.severity,
        labels: entryLabels,
        trace: entry.traceId
          ? `projects/${PROJECT_ID}/traces/${entry.traceId}`
          : undefined,
        spanId: entry.spanId,
      };

      return log.entry(metadata, {
        message: entry.message,
        timestamp: new Date().toISOString(),
        ...entry.jsonPayload,
      });
    });

    await log.write(logEntries);
  } catch (error) {
    console.error(`[CloudLogging] Failed to write batch:`, error);
    entries.forEach((entry) => console.log(JSON.stringify(entry)));
  }
}

// ============================================================================
// CLOUD LOGGING SINK FOR STRUCTURED LOGGER
// ============================================================================

/**
 * Create a Cloud Logging sink that can be used with StructuredLogger
 */
export class CloudLoggingSink {
  private readonly labels: Record<string, string>;

  constructor(labels?: Record<string, string>) {
    this.labels = {
      ...labels,
    };
  }

  /**
   * Write a log entry with the specified level
   */
  async write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    await writeLog({
      severity: mapSeverity(level) as CloudLogOptions['severity'],
      message,
      labels: this.labels,
      jsonPayload: context,
    });
  }

  /**
   * Set additional labels
   */
  setLabels(labels: Record<string, string>): void {
    Object.assign(this.labels, labels);
  }

  /**
   * Clear all labels
   */
  clearLabels(): void {
    Object.keys(this.labels).forEach((key) => {
      delete this.labels[key];
    });
  }
}

/**
 * Create a new CloudLoggingSink with the specified labels
 */
export function createCloudLoggingSink(
  labels?: Record<string, string>
): CloudLoggingSink {
  return new CloudLoggingSink(labels);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract trace ID from incoming request headers
 */
export function extractTraceId(headers?: Record<string, string | string[] | undefined>): string | undefined {
  if (!headers) return undefined;

  // Check for X-Cloud-Trace-Context header (format: TRACE_ID/SPAN_ID;o=OPTIONS)
  const traceContext = headers['x-cloud-trace-context'];
  if (typeof traceContext === 'string') {
    return traceContext.split('/')[0];
  }

  // Check for traceparent header (W3C format)
  const traceParent = headers['traceparent'];
  if (typeof traceParent === 'string') {
    // Format: 00-TRACE_ID-PARENT_ID-TRACE_FLAGS
    const parts = traceParent.split('-');
    if (parts.length >= 2) {
      return parts[1];
    }
  }

  return undefined;
}

/**
 * Check if Cloud Logging should be enabled
 */
export function isCloudLoggingEnabled(): boolean {
  // Enable in production by default, can be disabled via env var
  if (process.env.CLOUD_LOGGING_ENABLED === 'false') {
    return false;
  }
  return process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';
}
