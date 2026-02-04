/**
 * Performance Tracing System
 * Distributed tracing for monitoring request performance across functions
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getLogger } from '../lib/logger';

const logger = getLogger('performance-tracing');
const db = admin.firestore();

/**
 * Trace entry structure
 */
export interface TraceEntry {
  traceId: string;
  parentSpanId?: string;
  spanId: string;
  timestamp: Date | admin.firestore.Timestamp;
  function: string;
  method: string;
  userId?: string;
  organizationId?: string;
  duration: number;
  statusCode: number;
  success: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Span data for nested traces
 */
export interface SpanData {
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

const TRACES_COLLECTION = 'performance_traces';

/**
 * Active spans storage (in-memory for ongoing requests)
 * CRITICAL: Spans older than 5 minutes are auto-cleaned to prevent memory leaks
 */
const activeSpans = new Map<string, SpanData & { createdAt: number }>();

/**
 * Cleanup stale spans (called every 60 seconds)
 */
const SPAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function cleanupStaleSpans(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [spanId, span] of activeSpans.entries()) {
    if (now - span.createdAt > SPAN_TIMEOUT_MS) {
      activeSpans.delete(spanId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned stale spans', { count: cleaned });
  }
}

// Run cleanup every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupStaleSpans, 60000);
}

/**
 * Start a new span
 */
export function startSpan(
  traceId: string,
  name: string,
  parentSpanId?: string,
  metadata?: Record<string, any>
): string {
  const spanId = generateSpanId();

  const span: SpanData & { createdAt: number } = {
    spanId,
    parentSpanId,
    name,
    startTime: Date.now(),
    metadata,
    createdAt: Date.now(), // Track creation time for cleanup
  };

  activeSpans.set(spanId, span);

  return spanId;
}

/**
 * End a span and record the trace
 */
export async function endSpan(
  spanId: string,
  success: boolean,
  statusCode?: number,
  additionalMetadata?: Record<string, any>
): Promise<number> {
  const span = activeSpans.get(spanId);

  if (!span) {
    logger.warn('Span not found', { spanId });
    return 0;
  }

  const endTime = Date.now();
  const duration = endTime - span.startTime;

  const traceEntry: TraceEntry = {
    traceId: span.spanId.substring(0, 16),
    parentSpanId: span.parentSpanId,
    spanId: span.spanId,
    timestamp: new Date(span.startTime),
    function: span.name,
    method: 'callable',
    duration,
    statusCode: statusCode || (success ? 200 : 500),
    success,
    metadata: { ...span.metadata, ...additionalMetadata },
  };

  // Store in Firestore
  await db.collection(TRACES_COLLECTION).add(traceEntry);

  // Remove from active spans
  activeSpans.delete(spanId);

  return duration;
}

/**
 * Middleware wrapper for tracing function calls
 */
export function traceFunction<T extends (...args: any[]) => Promise<any>>(
  functionName: string,
  fn: T,
  options?: {
    userId?: string;
    organizationId?: string;
    metadata?: Record<string, any>;
  }
): T {
  return (async (...args: unknown[]) => {
    const spanId = startSpan(generateSpanId(), functionName, undefined, {
      ...options?.metadata,
      args: JSON.stringify(args).substring(0, 500),
    });

    try {
      const result = await fn(...args);
      await endSpan(spanId, true, 200, { result: 'success' });
      return result;
    } catch (error) {
      await endSpan(spanId, false, 500, {
        error: (error as Error).message,
      });
      throw error;
    }
  }) as T;
}

/**
 * Get performance statistics
 */
export const getPerformanceStatsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, timeRange = '24h' } = data as {
    organizationId?: string;
    timeRange?: '1h' | '6h' | '24h' | '7d';
  };

  try {
    const startTime = getTimeRangeStart(timeRange);

    let query = db
      .collection(TRACES_COLLECTION)
      .where('timestamp', '>=', startTime) as any;

    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }

    const snapshot = await query.get();

    const traces = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as TraceEntry);

    if (traces.length === 0) {
      return {
        success: true,
        stats: {
          totalRequests: 0,
          avgDuration: 0,
          p95Duration: 0,
          p99Duration: 0,
          errorRate: 0,
          byFunction: {},
        },
      };
    }

    // Calculate statistics
    const durations = traces.map((t: TraceEntry) => t.duration).sort((a: number, b: number) => a - b);
    const errors = traces.filter((t: TraceEntry) => !t.success);

    const avgDuration = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95Duration = durations[p95Index] || durations[durations.length - 1];
    const p99Duration = durations[p99Index] || durations[durations.length - 1];

    // Group by function
    const byFunction: Record<
      string,
      {
        count: number;
        avgDuration: number;
        maxDuration: number;
        minDuration: number;
        errorRate: number;
      }
    > = {};

    traces.forEach((trace: TraceEntry) => {
      if (!byFunction[trace.function]) {
        byFunction[trace.function] = {
          count: 0,
          avgDuration: 0,
          maxDuration: 0,
          minDuration: Infinity,
          errorRate: 0,
        };
      }

      const stats = byFunction[trace.function];
      stats.count++;
      stats.avgDuration += trace.duration;
      stats.maxDuration = Math.max(stats.maxDuration, trace.duration);
      stats.minDuration = Math.min(stats.minDuration, trace.duration);

      if (!trace.success) {
        stats.errorRate++;
      }
    });

    // Calculate averages
    Object.keys(byFunction).forEach(fn => {
      const stats = byFunction[fn];
      stats.avgDuration = stats.avgDuration / stats.count;
      stats.errorRate = (stats.errorRate / stats.count) * 100;
      stats.minDuration = stats.minDuration === Infinity ? 0 : stats.minDuration;
    });

    return {
      success: true,
      stats: {
        totalRequests: traces.length,
        avgDuration: Math.round(avgDuration),
        p95Duration: Math.round(p95Duration),
        p99Duration: Math.round(p99Duration),
        errorRate: (errors.length / traces.length) * 100,
        byFunction,
      },
      timeRange,
    };
  } catch (error) {
    logger.error('Failed to get performance stats', { error });
    throw new HttpsError(
      'internal',
      `Failed to get stats: ${(error as Error).message}`
    );
  }
};

export const getPerformanceStats = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
  },
  getPerformanceStatsHandler
);

/**
 * Get slow requests
 */
export const getSlowRequestsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, limit = 20, thresholdMs = 3000 } = data as {
    organizationId?: string;
    limit?: number;
    thresholdMs?: number;
  };

  try {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - 24);

    let query = db
      .collection(TRACES_COLLECTION)
      .where('timestamp', '>=', startTime)
      .where('duration', '>=', thresholdMs)
      .orderBy('duration', 'desc')
      .limit(limit) as any;

    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }

    const snapshot = await query.get();

    const traces = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as TraceEntry);

    return { success: true, traces, count: traces.length, thresholdMs };
  } catch (error) {
    logger.error('Failed to get slow requests', { error });
    throw new HttpsError(
      'internal',
      `Failed to get slow requests: ${(error as Error).message}`
    );
  }
};

export const getSlowRequests = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
  },
  getSlowRequestsHandler
);

/**
 * Get trace timeline for a specific trace ID
 */
export const getTraceTimelineHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { traceId } = data as { traceId: string };

  if (!traceId) {
    throw new HttpsError('invalid-argument', 'traceId is required');
  }

  try {
    const snapshot = await db
      .collection(TRACES_COLLECTION)
      .where('traceId', '==', traceId)
      .orderBy('timestamp', 'asc')
      .get();

    if (snapshot.empty) {
      return { success: true, timeline: [], traceId };
    }

    const traces = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as TraceEntry);

    // Build timeline tree
    const rootSpans: TraceEntry[] = [];
    const spanMap = new Map<string, TraceEntry>();

    traces.forEach((trace: TraceEntry) => {
      spanMap.set(trace.spanId, trace);
    });

    traces.forEach((trace: TraceEntry) => {
      if (!trace.parentSpanId) {
        rootSpans.push(trace);
      } else {
        const parent = spanMap.get(trace.parentSpanId);
        if (parent) {
          if (!parent.metadata) {
            parent.metadata = {};
          }
          if (!parent.metadata.children) {
            parent.metadata.children = [];
          }
          parent.metadata.children.push(trace);
        }
      }
    });

    // Calculate total duration
    const totalDuration = Math.max(
      ...rootSpans.map(t => t.duration + (t.metadata?.children?.length || 0))
    );

    return {
      success: true,
      timeline: rootSpans,
      traceId,
      totalDuration,
      spanCount: traces.length,
    };
  } catch (error) {
    logger.error('Failed to get trace timeline', { error });
    throw new HttpsError(
      'internal',
      `Failed to get timeline: ${(error as Error).message}`
    );
  }
};

export const getTraceTimeline = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
  },
  getTraceTimelineHandler
);

/**
 * Get performance trends over time
 */
export const getPerformanceTrendsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, period = '24h', functionName } = data as {
    organizationId?: string;
    period?: '1h' | '6h' | '24h' | '7d';
    functionName?: string;
  };

  try {
    const startTime = getTimeRangeStart(period);
    const buckets = getTimeBuckets(period);

    let query = db
      .collection(TRACES_COLLECTION)
      .where('timestamp', '>=', startTime) as any;

    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }

    if (functionName) {
      query = query.where('function', '==', functionName);
    }

    const snapshot = await query.get();
    const traces = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as TraceEntry);

    const toDate = (d: Date | admin.firestore.Timestamp): Date =>
      d instanceof Date ? d : (d as admin.firestore.Timestamp).toDate();

    // Aggregate by time bucket
    const trends = buckets.map(bucket => {
      const bucketTraces = traces.filter((t: TraceEntry) => {
        const ts = toDate(t.timestamp);
        return ts >= bucket.start && ts < bucket.end;
      });

      const durations = bucketTraces.map((t: TraceEntry) => t.duration);
      const avgDuration = durations.length > 0
        ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
        : 0;
      const errors = bucketTraces.filter((t: TraceEntry) => !t.success).length;

      return {
        label: bucket.label,
        timestamp: bucket.start.toISOString(),
        requestCount: bucketTraces.length,
        avgDuration: Math.round(avgDuration),
        errorRate: bucketTraces.length > 0
          ? (errors / bucketTraces.length) * 100
          : 0,
        p95Duration: durations.length > 0
          ? durations[Math.floor(durations.length * 0.95)] || 0
          : 0,
      };
    });

    return { success: true, trends, period };
  } catch (error) {
    logger.error('Failed to get performance trends', { error });
    throw new HttpsError(
      'internal',
      `Failed to get trends: ${(error as Error).message}`
    );
  }
};

export const getPerformanceTrends = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
  },
  getPerformanceTrendsHandler
);

/**
 * HTTP endpoint for real-time performance stream (SSE)
 */
export const performanceStreamHandler = async (req: any, res: any) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set headers for SSE
  res.set('Content-Type', 'text/event-stream');
  res.set('Cache-Control', 'no-cache');
  res.set('Connection', 'keep-alive');
  res.set('X-Accel-Buffering', 'no'); // Disable nginx buffering

  const { organizationId, slowThreshold = '3000' } = req.query;

  // Track if response is still writable
  let isAlive = true;
  let keepAlive: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  // Cleanup function
  const cleanup = () => {
    if (!isAlive) return;
    isAlive = false;

    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    logger.debug('Performance stream cleaned up');
  };

  // Handle connection errors
  req.on('error', (error: Error) => {
    logger.error('Performance stream request error', { error });
    cleanup();
  });

  res.on('error', (error: Error) => {
    logger.error('Performance stream response error', { error });
    cleanup();
  });

  res.on('close', cleanup);
  req.on('close', cleanup);

  // Send initial keep-alive
  try {
    res.write(': keep-alive\n\n');
      } catch (err) {
        logger.error('Failed to write initial keep-alive', { error: err });
    cleanup();
    return;
  }

  // Watch for new traces
  const startTime = new Date();
  startTime.setSeconds(startTime.getSeconds() - 10); // Last 10 seconds

  let query = db.collection(TRACES_COLLECTION)
    .where('timestamp', '>=', startTime)
    .orderBy('timestamp', 'desc')
    .limit(50) as any;

  if (organizationId && typeof organizationId === 'string') {
    query = query.where('organizationId', '==', organizationId);
  }

  // Set up Firestore snapshot listener
  unsubscribe = query.onSnapshot(
    (snapshot: admin.firestore.QuerySnapshot) => {
      if (!isAlive) {
        if (unsubscribe) unsubscribe();
        return;
      }

      try {
        const traces = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
          const data = doc.data();
          // Highlight slow requests
          const isSlow = (data.duration || 0) >= parseInt(slowThreshold as string);
          return { ...data, isSlow };
        });

        res.write(`data: ${JSON.stringify({ traces, count: traces.length })}\n\n`);
      } catch (err) {
        logger.error('Failed to write performance data', { error: err });
        cleanup();
      }
    },
    (err: Error) => {
      logger.error('Performance stream error', { error: err });
      if (isAlive) {
        try {
          res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        } catch {
          // Ignore write errors if connection is already closed
        }
      }
      cleanup();
    }
  );

  // Send keep-alive every 30 seconds
  keepAlive = setInterval(() => {
    if (!isAlive) {
      if (keepAlive) clearInterval(keepAlive);
      return;
    }

    try {
      res.write(': keep-alive\n\n');
    } catch (error) {
      logger.debug('Keep-alive failed, connection closed');
      cleanup();
    }
  }, 30000);

  // Set maximum connection timeout of 5 minutes
  setTimeout(() => {
    if (isAlive) {
      logger.debug('Performance stream timeout reached');
      try {
        res.write('data: {"type":"timeout","message":"Stream timeout"}\n\n');
      } catch {
        // Ignore
      }
      cleanup();
    }
  }, 5 * 60 * 1000);
};

export const performanceStream = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
  },
  performanceStreamHandler
);

/**
 * Cleanup old traces
 */
export const cleanupOldTracesHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { olderThanDays = 7 } = data as { olderThanDays?: number };

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const snapshot = await db
      .collection(TRACES_COLLECTION)
      .where('timestamp', '<', cutoffDate)
      .limit(1000)
      .get();

    const batch = db.batch();
    let deletedCount = 0;

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    logger.info('Old traces cleaned up', { userId, deletedCount, olderThanDays });

    return { success: true, deletedCount };
  } catch (error) {
    logger.error('Failed to cleanup old traces', { error });
    throw new HttpsError(
      'internal',
      `Failed to cleanup: ${(error as Error).message}`
    );
  }
};

export const cleanupOldTraces = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  cleanupOldTracesHandler
);

// Helper functions

function generateSpanId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getTimeRangeStart(range: string): Date {
  const now = new Date();

  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

interface TimeBucket {
  label: string;
  start: Date;
  end: Date;
}

function getTimeBuckets(period: string): TimeBucket[] {
  const now = new Date();
  const buckets: TimeBucket[] = [];

  if (period === '1h') {
    // Minute buckets for last hour
    for (let i = 60; i > 0; i--) {
      const start = new Date(now.getTime() - i * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 1000);
      buckets.push({
        label: start.getMinutes().toString(),
        start,
        end,
      });
    }
  } else if (period === '24h') {
    // Hourly buckets
    for (let i = 24; i > 0; i--) {
      const start = new Date(now.getTime() - i * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      buckets.push({
        label: start.getHours() + ':00',
        start,
        end,
      });
    }
  } else {
    // Daily buckets for 7 days
    for (let i = 7; i > 0; i--) {
      const start = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({
        label: start.toLocaleDateString('pt-BR', { weekday: 'short' }),
        start,
        end,
      });
    }
  }

  return buckets;
}

