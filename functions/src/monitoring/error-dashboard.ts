/**
 * Error Dashboard System
 * Real-time error tracking and aggregation for monitoring
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getLogger } from '../lib/logger';
import * as crypto from 'crypto';

const logger = getLogger('error-dashboard');
const db = admin.firestore();

/**
 * Error entry structure
 */
export interface ErrorEntry {
  id: string;
  timestamp: Date | admin.firestore.Timestamp;
  function: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  organizationId?: string;
  patientId?: string;
  requestId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  occurrences: number;
  lastOccurrence: Date | admin.firestore.Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  totalErrors: number;
  byFunction: Record<string, number>;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: ErrorEntry[];
  topErrors: Array<{ error: ErrorEntry; count: number }>;
}

const ERRORS_COLLECTION = 'error_logs';

/**
 * Log an error to the error dashboard
 */
export async function logError(error: {
  function: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  organizationId?: string;
  patientId?: string;
  requestId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}): Promise<void> {
  const errorHash = generateErrorHash(
    error.function,
    error.errorType,
    error.errorMessage
  );

  const errorRef = db.collection(ERRORS_COLLECTION).doc(errorHash);

  const now = new Date();

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(errorRef);

    if (doc.exists) {
      // Update existing error
      const data = doc.data() as ErrorEntry;
      transaction.update(errorRef, {
        occurrences: data.occurrences + 1,
        lastOccurrence: now,
        resolved: false,
        resolvedAt: null,
        resolvedBy: null,
      });
    } else {
      // Create new error entry
      const newError: ErrorEntry = {
        id: errorHash,
        timestamp: now,
        function: error.function,
        errorType: error.errorType,
        errorMessage: error.errorMessage,
        stackTrace: error.stackTrace,
        userId: error.userId,
        organizationId: error.organizationId,
        patientId: error.patientId,
        requestId: error.requestId,
        severity: error.severity || 'medium',
        resolved: false,
        occurrences: 1,
        lastOccurrence: now,
        metadata: error.metadata,
      };
      transaction.set(errorRef, newError);
    }
  });
}

/**
 * Generate error hash for deduplication
 */
function generateErrorHash(func: string, type: string, message: string): string {
  const data = `${func}:${type}:${message}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Get error statistics
 */
export const getErrorStatsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, timeRange = '24h' } = data as {
    organizationId?: string;
    timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  };

  try {
    const startTime = getTimeRangeStart(timeRange);

    let query = db
      .collection(ERRORS_COLLECTION)
      .where('lastOccurrence', '>=', startTime) as any;

    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }

    const snapshot = await query.get();

    const errors = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as ErrorEntry);

    // Calculate statistics
    const stats: ErrorStats = {
      totalErrors: errors.length,
      byFunction: {},
      byType: {},
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      recentErrors: errors
        .sort((a: ErrorEntry, b: ErrorEntry) => {
          const aTime = a.lastOccurrence instanceof Date
            ? a.lastOccurrence.getTime()
            : (a.lastOccurrence as admin.firestore.Timestamp).toMillis();
          const bTime = b.lastOccurrence instanceof Date
            ? b.lastOccurrence.getTime()
            : (b.lastOccurrence as admin.firestore.Timestamp).toMillis();
          return bTime - aTime;
        })
        .slice(0, 20),
      topErrors: [],
    };

    errors.forEach((error: ErrorEntry) => {
      // By function
      stats.byFunction[error.function] =
        (stats.byFunction[error.function] || 0) + error.occurrences;

      // By type
      stats.byType[error.errorType] =
        (stats.byType[error.errorType] || 0) + error.occurrences;

      // By severity
      stats.bySeverity[error.severity] =
        (stats.bySeverity[error.severity] || 0) + error.occurrences;
    });

    // Top errors by occurrences
    stats.topErrors = errors
      .sort((a: ErrorEntry, b: ErrorEntry) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map((error: ErrorEntry) => ({ error, count: error.occurrences }));

    return { success: true, stats, timeRange };
  } catch (error) {
    logger.error('Failed to get error stats', { error });
    throw new HttpsError(
      'internal',
      `Failed to get error stats: ${(error as Error).message}`
    );
  }
};

export const getErrorStats = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  getErrorStatsHandler
);

/**
 * Get recent errors
 */
export const getRecentErrorsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, limit = 50, unresolvedOnly = false } = data as {
    organizationId?: string;
    limit?: number;
    unresolvedOnly?: boolean;
  };

  try {
    let query = db
      .collection(ERRORS_COLLECTION)
      .orderBy('lastOccurrence', 'desc')
      .limit(limit) as any;

    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }

    if (unresolvedOnly) {
      query = query.where('resolved', '==', false);
    }

    const snapshot = await query.get();

    const errors = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as ErrorEntry);

    return { success: true, errors, count: errors.length };
  } catch (error) {
    logger.error('Failed to get recent errors', { error });
    throw new HttpsError(
      'internal',
      `Failed to get recent errors: ${(error as Error).message}`
    );
  }
};

export const getRecentErrors = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  getRecentErrorsHandler
);

/**
 * Resolve an error
 */
export const resolveErrorHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { errorId } = data as { errorId: string };

  if (!errorId) {
    throw new HttpsError('invalid-argument', 'errorId is required');
  }

  try {
    const errorRef = db.collection(ERRORS_COLLECTION).doc(errorId);

    await errorRef.update({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: userId,
    });

    logger.info('Error resolved', { errorId, userId });

    return { success: true };
  } catch (error) {
    logger.error('Failed to resolve error', { error });
    throw new HttpsError(
      'internal',
      `Failed to resolve error: ${(error as Error).message}`
    );
  }
};

export const resolveError = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  resolveErrorHandler
);

/**
 * Get error details
 */
export const getErrorDetailsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { errorId } = data as { errorId: string };

  if (!errorId) {
    throw new HttpsError('invalid-argument', 'errorId is required');
  }

  try {
    const doc = await db.collection(ERRORS_COLLECTION).doc(errorId).get();

    if (!doc.exists) {
      throw new HttpsError('not-found', 'Error not found');
    }

    const error = doc.data() as ErrorEntry;

    return { success: true, error };
  } catch (error) {
    if ((error as HttpsError).code === 'not-found') {
      throw error;
    }
    logger.error('Failed to get error details', { error });
    throw new HttpsError(
      'internal',
      `Failed to get error details: ${(error as Error).message}`
    );
  }
};

export const getErrorDetails = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  getErrorDetailsHandler
);

/**
 * HTTP endpoint for real-time error stream (Server-Sent Events)
 */
export const errorStreamHandler = async (req: any, res: any) => {
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

  const { organizationId } = req.query;

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

    logger.debug('Error stream cleaned up');
  };

  // Handle connection errors
  req.on('error', (error: Error) => {
    logger.error('Error stream request error', { error });
    cleanup();
  });

  res.on('error', (error: Error) => {
    logger.error('Error stream response error', { error });
    cleanup();
  });

  res.on('close', cleanup);
  req.on('close', cleanup);

  // Send initial keep-alive
  try {
    res.write(': keep-alive\n\n');
  } catch (error) {
    logger.error('Failed to write initial keep-alive', { error });
    cleanup();
    return;
  }

  // Watch for new errors
  let query = db.collection(ERRORS_COLLECTION)
    .where('resolved', '==', false)
    .orderBy('lastOccurrence', 'desc')
    .limit(10) as any;

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
        const errors = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as ErrorEntry);
        res.write(`data: ${JSON.stringify({ errors, count: errors.length })}\n\n`);
      } catch (err) {
        logger.error('Failed to write error data', { error: err });
        cleanup();
      }
    },
    (err: Error) => {
      logger.error('Error stream error', { error: err });
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
      logger.debug('Error stream timeout reached');
      try {
        res.write('data: {"type":"timeout","message":"Stream timeout"}\n\n');
      } catch {
        // Ignore
      }
      cleanup();
    }
  }, 5 * 60 * 1000);
};

export const errorStream = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  errorStreamHandler
);

/**
 * Get error trends over time
 */
export const getErrorTrendsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { period = '7d' } = data as {
    organizationId?: string;
    period?: '24h' | '7d' | '30d';
  };

  try {
    const startTime = getTimeRangeStart(period);
    const buckets = getTimeBuckets(period);

    const snapshot = await db
      .collection(ERRORS_COLLECTION)
      .where('lastOccurrence', '>=', startTime)
      .get();

    const errors = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as ErrorEntry);

    const toDate = (d: Date | admin.firestore.Timestamp): Date =>
      d instanceof Date ? d : (d as admin.firestore.Timestamp).toDate();

    // Aggregate errors by time bucket
    const trends = buckets.map(bucket => {
      const bucketErrors = errors.filter(e => {
        const occ = toDate(e.lastOccurrence);
        return occ >= bucket.start && occ < bucket.end;
      });

      return {
        label: bucket.label,
        timestamp: bucket.start.toISOString(),
        count: bucketErrors.length,
        uniqueErrors: bucketErrors.length,
        critical: bucketErrors.filter(e => e.severity === 'critical').length,
        high: bucketErrors.filter(e => e.severity === 'high').length,
      };
    });

    return { success: true, trends, period };
  } catch (error) {
    logger.error('Failed to get error trends', { error });
    throw new HttpsError(
      'internal',
      `Failed to get error trends: ${(error as Error).message}`
    );
  }
};

export const getErrorTrends = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  getErrorTrendsHandler
);

/**
 * Batch delete old resolved errors
 */
export const cleanupOldErrorsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { olderThanDays = 30 } = data as { olderThanDays?: number };

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const snapshot = await db
      .collection(ERRORS_COLLECTION)
      .where('resolved', '==', true)
      .where('resolvedAt', '<', cutoffDate)
      .limit(500)
      .get();

    const batch = db.batch();
    let deletedCount = 0;

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    logger.info('Old errors cleaned up', { userId, deletedCount, olderThanDays });

    return { success: true, deletedCount };
  } catch (error) {
    logger.error('Failed to cleanup old errors', { error });
    throw new HttpsError(
      'internal',
      `Failed to cleanup: ${(error as Error).message}`
    );
  }
};

export const cleanupOldErrors = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  cleanupOldErrorsHandler
);

// Helper functions

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
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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

  if (period === '24h') {
    // Hourly buckets for last 24 hours
    for (let i = 24; i > 0; i--) {
      const start = new Date(now.getTime() - i * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      buckets.push({
        label: start.getHours() + ':00',
        start,
        end,
      });
    }
  } else if (period === '7d') {
    // Daily buckets for last 7 days
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
  } else {
    // Daily buckets for last 30 days
    for (let i = 30; i > 0; i--) {
      const start = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({
        label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        start,
        end,
      });
    }
  }

  return buckets;
}
