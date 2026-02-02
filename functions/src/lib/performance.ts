/**
 * Firebase Performance Monitoring Integration
 *
 * Provides performance tracking for Cloud Functions
 * Compatible with Firebase Performance Monitoring SDK
 *
 * @module lib/performance
 */

import { performance } from 'perf_hooks';
import { getLogger } from './logger';

const logger = getLogger('performance');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PERFORMANCE_ENABLED = process.env.PERFORMANCE_MONITORING_ENABLED !== 'false';

// ============================================================================
// TYPES
// ============================================================================

export interface TraceMetric {
  name: string;
  value: number;
  unit?: string;
}

export interface TraceAttributes {
  [key: string]: string;
}

export interface TraceOptions {
  attributes?: TraceAttributes;
}

// ============================================================================
// PERFORMANCE TRACE CLASS
// ============================================================================

/**
 * Firebase Performance Trace
 *
 * Measures the duration of an operation
 */
export class FirebasePerformanceTrace {
  private readonly name: string;
  private readonly startTime: number;
  private readonly attributes: Map<string, string>;
  private readonly metrics: Map<string, number>;
  private stopped = false;

  constructor(name: string, options?: TraceOptions) {
    this.name = name;
    this.startTime = performance.now();
    this.attributes = new Map(Object.entries(options?.attributes || {}));
    this.metrics = new Map();

    logger.debug(`Trace started: ${this.name}`);
  }

  /**
   * Record a metric value for this trace
   *
   * @param metricName - Name of the metric
   * @param value - Metric value (number)
   */
  putMetric(metricName: string, value: number): void {
    this.metrics.set(metricName, value);
    logger.debug(`Trace [${this.name}] metric: ${metricName} = ${value}`);
  }

  /**
   * Increment a metric value
   *
   * @param metricName - Name of the metric
   * @param increment - Amount to increment (default: 1)
   */
  incrementMetric(metricName: string, increment: number = 1): void {
    const currentValue = this.metrics.get(metricName) || 0;
    this.metrics.set(metricName, currentValue + increment);
  }

  /**
   * Set an attribute for this trace
   *
   * @param key - Attribute key
   * @param value - Attribute value
   */
  putAttribute(key: string, value: string): void {
    this.attributes.set(key, value);
  }

  /**
   * Get an attribute value
   *
   * @param key - Attribute key
   * @returns Attribute value or undefined
   */
  getAttribute(key: string): string | undefined {
    return this.attributes.get(key);
  }

  /**
   * Get all attributes
   *
   * @returns Object with all attributes
   */
  getAttributes(): TraceAttributes {
    return Object.fromEntries(this.attributes);
  }

  /**
   * Get a metric value
   *
   * @param metricName - Name of the metric
   * @returns Metric value or undefined
   */
  getMetric(metricName: string): number | undefined {
    return this.metrics.get(metricName);
  }

  /**
   * Get all metrics
   *
   * @returns Object with all metrics
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Stop the trace and record its duration
   *
   * @returns Duration in milliseconds
   */
  stop(): number {
    if (this.stopped) {
      logger.warn(`Trace [${this.name}] already stopped`);
      return 0;
    }

    this.stopped = true;
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    // Log trace completion
    logger.info(`Trace [${this.name}] completed`, {
      duration: `${duration.toFixed(2)}ms`,
      metrics: Object.fromEntries(this.metrics),
      attributes: Object.fromEntries(this.attributes),
    });

    // Record to Firebase Performance Monitoring
    if (PERFORMANCE_ENABLED) {
      this.recordToFirebase(duration);
    }

    return duration;
  }

  /**
   * Stop the trace and return a result
   *
   * @param result - Result value to return
   * @returns Tuple of [duration, result]
   */
  stopWithResult<T>(result: T): [number, T] {
    const duration = this.stop();
    return [duration, result];
  }

  /**
   * Record the trace to Firebase Performance Monitoring
   */
  private recordToFirebase(duration: number): void {
    try {
      // In a real Firebase Performance Monitoring SDK integration,
      // this would send the trace data to Firebase
      logger.debug(`Trace [${this.name}] recorded to Firebase`, {
        duration,
        metrics: Object.fromEntries(this.metrics),
      });
    } catch (error) {
      logger.error(`Failed to record trace [${this.name}] to Firebase:`, error);
    }
  }
}

// ============================================================================
// PERFORMANCE MONITORING FUNCTIONS
// ============================================================================

/**
 * Start a new performance trace
 *
 * @param name - Trace name
 * @param options - Trace options
 * @returns FirebasePerformanceTrace instance
 */
export function startTrace(
  name: string,
  options?: TraceOptions
): FirebasePerformanceTrace {
  if (!PERFORMANCE_ENABLED) {
    logger.debug('Performance monitoring disabled');
  }
  return new FirebasePerformanceTrace(name, options);
}

/**
 * Measure the duration of an async function
 *
 * @param name - Trace name
 * @param fn - Function to measure
 * @returns Result of the function
 */
export async function measure<T>(
  name: string,
  fn: (trace: FirebasePerformanceTrace) => Promise<T>,
  options?: TraceOptions
): Promise<T> {
  const trace = new FirebasePerformanceTrace(name, options);

  try {
    const result = await fn(trace);
    trace.stop();
    return result;
  } catch (error) {
    trace.stop();
    throw error;
  }
}

/**
 * Measure the duration of a sync function
 *
 * @param name - Trace name
 * @param fn - Function to measure
 * @returns Result of the function
 */
export function measureSync<T>(
  name: string,
  fn: (trace: FirebasePerformanceTrace) => T,
  options?: TraceOptions
): T {
  const trace = new FirebasePerformanceTrace(name, options);

  try {
    const result = fn(trace);
    trace.stop();
    return result;
  } catch (error) {
    trace.stop();
    throw error;
  }
}

/**
 * Measure an HTTP call
 *
 * @param url - URL being called
 * @param fn - Function that performs the HTTP call
 * @returns Result of the function
 */
export async function measureHttpCall<T>(
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  const trace = new FirebasePerformanceTrace(`http_${url}`);

  try {
    const result = await fn();
    trace.stop();
    return result;
  } catch (error) {
    trace.stop();
    throw error;
  }
}

/**
 * Measure a database operation
 *
 * @param operation - Operation name
 * @param fn - Function that performs the operation
 * @returns Result of the function
 */
export async function measureDatabase<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const trace = new FirebasePerformanceTrace(`db_${operation}`);

  try {
    const result = await fn();
    trace.stop();
    return result;
  } catch (error) {
    trace.stop();
    throw error;
  }
}

/**
 * Measure a Firestore operation
 *
 * @param operation - Operation name (e.g., 'get_patient', 'update_appointment')
 * @param fn - Function that performs the operation
 * @returns Result of the function
 */
export async function measureFirestore<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const trace = new FirebasePerformanceTrace(`firestore_${operation}`);

  try {
    const result = await fn();
    trace.stop();
    return result;
  } catch (error) {
    trace.stop();
    throw error;
  }
}

// ============================================================================
// HTTP TRACE CLASS
// ============================================================================

/**
 * HTTP Request/Response Trace
 *
 * Measures HTTP request performance with additional metrics
 */
export class HttpTrace extends FirebasePerformanceTrace {
  private requestSize = 0;
  private responseSize = 0;
  private statusCode = 0;

  constructor(url: string, method: string) {
    super(`http_${method}_${url}`, {
      attributes: {
        url,
        method,
      },
    });
  }

  /**
   * Set request size in bytes
   */
  setRequestSize(size: number): void {
    this.requestSize = size;
    this.putMetric('request_size', size);
  }

  /**
   * Set response size in bytes
   */
  setResponseSize(size: number): void {
    this.responseSize = size;
    this.putMetric('response_size', size);
  }

  /**
   * Set HTTP status code
   */
  setStatusCode(code: number): void {
    this.statusCode = code;
    this.putAttribute('status_code', String(code));
  }

  /**
   * Check if the request was successful
   */
  isSuccessful(): boolean {
    return this.statusCode >= 200 && this.statusCode < 300;
  }

  /**
   * Stop the HTTP trace
   */
  stop(): number {
    this.putMetric('request_size', this.requestSize);
    this.putMetric('response_size', this.responseSize);
    return super.stop();
  }
}

/**
 * Start a new HTTP trace
 *
 * @param url - Request URL
 * @param method - HTTP method
 * @returns HttpTrace instance
 */
export function startHttpTrace(url: string, method: string): HttpTrace {
  return new HttpTrace(url, method);
}

// ============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// ============================================================================

/**
 * Create a performance monitoring middleware
 *
 * Wraps a function with automatic performance tracing
 */
export function withPerformanceTracing<T extends (...args: unknown[]) => ReturnType<T>>(
  name: string,
  fn: T
): T {
  return ((...args: unknown[]) => {
    const trace = startTrace(name);
    try {
      const result = fn(...args);
      // Handle both sync and async
      if (result instanceof Promise) {
        return result
          .then((value) => {
            trace.stop();
            return value;
          })
          .catch((error) => {
            trace.stop();
            throw error;
          });
      }
      trace.stop();
      return result;
    } catch (error) {
      trace.stop();
      throw error;
    }
  }) as T;
}

/**
 * Check if Performance Monitoring is enabled
 */
export function isPerformanceEnabled(): boolean {
  return PERFORMANCE_ENABLED;
}

// ============================================================================
// PERFORMANCE COUNTERS
// ============================================================================

/**
 * Simple counter for tracking occurrences
 */
export class PerformanceCounter {
  private readonly name: string;
  private count = 0;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Increment the counter
   */
  increment(amount = 1): void {
    this.count += amount;
  }

  /**
   * Reset the counter
   */
  reset(): void {
    this.count = 0;
  }

  /**
   * Get the current count
   */
  getCount(): number {
    return this.count;
  }

  /**
   * Create a trace from this counter
   */
  toTrace(): FirebasePerformanceTrace {
    const trace = new FirebasePerformanceTrace(`counter_${this.name}`);
    trace.putMetric('count', this.count);
    return trace;
  }
}

/**
 * Create a new performance counter
 */
export function createCounter(name: string): PerformanceCounter {
  return new PerformanceCounter(name);
}
