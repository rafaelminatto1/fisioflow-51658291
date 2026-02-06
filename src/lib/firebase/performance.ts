/**
 * Firebase Performance Monitoring - Frontend Integration
 *
 * Performance tracking for web and mobile apps
 *
 * @module lib/firebase/performance
 */


// ============================================================================
// TYPES
// ============================================================================

import { getApp } from 'firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface TraceMetric {
  name: string;
  value: number;
  unit?: string;
}

export interface TraceAttributes {
  [key: string]: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PERFORMANCE_ENABLED = import.meta.env.VITE_PERFORMANCE_MONITORING_ENABLED === 'true';

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

/**
 * Initialize Firebase Performance Monitoring
 */
export async function initPerformanceMonitoring(): Promise<void> {
  if (initialized) {
    return;
  }

  if (!PERFORMANCE_ENABLED) {
    logger.debug('Performance Monitoring disabled via VITE_PERFORMANCE_MONITORING_ENABLED');
    initialized = true;
    return;
  }

  try {
    // Dynamically import Performance Monitoring to avoid errors if not available
    const { getPerformance } = await import('firebase/performance');
    const app = getApp();
    const _perf = getPerformance(app);

    // Performance is automatically collected
    logger.debug('Firebase Performance Monitoring initialized');
    initialized = true;
  } catch (error) {
    logger.error('Failed to initialize Performance Monitoring:', error);
    initialized = true; // Prevent retries
  }
}

/**
 * Check if Performance Monitoring is enabled
 */
export function isPerformanceEnabled(): boolean {
  return PERFORMANCE_ENABLED;
}

// ============================================================================
// CUSTOM TRACES
// ============================================================================

/**
 * Start a custom trace
 */
export async function startTrace(name: string): Promise<PerformanceTrace> {
  if (!PERFORMANCE_ENABLED) {
    return new PerformanceTrace(name);
  }

  try {
    const { getPerformance, trace } = await import('firebase/performance');
    const app = getApp();
    const perf = getPerformance(app);
    const t = trace(perf, name);

    await t.start();

    return new PerformanceTrace(name, t);
  } catch (error) {
    logger.error('Failed to start trace:', error);
    return new PerformanceTrace(name);
  }
}

/**
 * Performance Trace class
 */
export class PerformanceTrace {
  private readonly name: string;
  private firebaseTrace: unknown | null;
  private metrics: Map<string, number> = new Map();
  private attributes: Map<string, string> = new Map();
  private startTime: number;

  constructor(name: string, firebaseTrace?: unknown) {
    this.name = name;
    this.firebaseTrace = firebaseTrace || null;
    this.startTime = performance.now();
  }

  /**
   * Record a metric value
   */
  putMetric(metricName: string, value: number): void {
    this.metrics.set(metricName, value);
    if (this.firebaseTrace) {
      this.firebaseTrace.recordMetric(metricName, value);
    }
  }

  /**
   * Increment a metric value
   */
  incrementMetric(metricName: string, increment: number = 1): void {
    const currentValue = this.metrics.get(metricName) || 0;
    this.putMetric(metricName, currentValue + increment);
  }

  /**
   * Set an attribute
   */
  putAttribute(key: string, value: string): void {
    this.attributes.set(key, value);
    if (this.firebaseTrace) {
      this.firebaseTrace.putAttribute(key, value);
    }
  }

  /**
   * Stop the trace
   */
  async stop(): Promise<number> {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    logger.info(`Trace [${this.name}] completed`, {
      duration: `${duration.toFixed(2)}ms`,
      metrics: Object.fromEntries(this.metrics),
    });

    if (this.firebaseTrace) {
      await this.firebaseTrace.stop();
    }

    return duration;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Measure the duration of an async function
 */
export async function measure<T>(
  name: string,
  fn: (trace: PerformanceTrace) => Promise<T> | T
): Promise<T> {
  const trace = await startTrace(name);

  try {
    const result = await fn(trace);
    await trace.stop();
    return result;
  } catch (error) {
    await trace.stop();
    throw error;
  }
}

/**
 * Measure an HTTP request
 */
export async function measureHttpCall<T>(
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  const trace = await startTrace(`http_${url}`);

  try {
    trace.putAttribute('url', url);
    const result = await fn();
    await trace.stop();
    return result;
  } catch (error) {
    await trace.stop();
    throw error;
  }
}

/**
 * Measure a Firestore operation
 */
export async function measureFirestore<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const trace = await startTrace(`firestore_${operation}`);

  try {
    const result = await fn();
    await trace.stop();
    return result;
  } catch (error) {
    await trace.stop();
    throw error;
  }
}

// ============================================================================
// HTTP TRACE CLASS
// ============================================================================

/**
 * HTTP Request/Response Trace
 */
export class HttpTrace extends PerformanceTrace {
  constructor(url: string, method: string) {
    super(`http_${method}_${url}`);
    this.putAttribute('url', url);
    this.putAttribute('method', method);
  }

  /**
   * Set HTTP status code
   */
  setStatusCode(code: number): void {
    this.putAttribute('status_code', String(code));
    this.putMetric('status_code', code);
  }

  /**
   * Check if the request was successful
   */
  isSuccessful(): boolean {
    const statusCode = this.attributes.get('status_code');
    if (!statusCode) return false;
    const code = parseInt(statusCode, 10);
    return code >= 200 && code < 300;
  }
}

/**
 * Start a new HTTP trace
 */
export async function startHttpTrace(url: string, method: string): Promise<HttpTrace> {
  const _trace = await startTrace(`http_${method}_${url}`);
  return new HttpTrace(url, method);
}

// ============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// ============================================================================

/**
 * Wrap a function with automatic performance tracing
 */
export function withPerformanceTracing<T extends (...args: unknown[]) => ReturnType<T>>(
  name: string,
  fn: T
): T {
  return ((...args: unknown[]) => {
    const tracePromise = startTrace(name);

    const handleResult = async (trace: PerformanceTrace) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          const value = await result;
          await trace.stop();
          return value;
        }
        await trace.stop();
        return result;
      } catch (error) {
        await trace.stop();
        throw error;
      }
    };

    return tracePromise.then(handleResult);
  }) as T;
}
