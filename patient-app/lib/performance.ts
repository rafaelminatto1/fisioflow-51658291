/**
 * Performance Monitoring Utilities
 * Track and monitor app performance metrics
 */

import { Performance } from 'react-native';
import { log } from './logger';

/**
 * Performance metric interface
 */
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  success?: boolean;
  error?: string;
}

/**
 * Performance monitor class
 */
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = __DEV__;

  /**
   * Start measuring a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);
  }

  /**
   * End measuring a performance metric
   */
  end(name: string, success: boolean = true, error?: string): number | undefined {
    if (!this.isEnabled) return undefined;

    const metric = this.metrics.get(name);
    if (!metric) {
      log.warn('PERFORMANCE', `No metric found for: ${name}`);
      return undefined;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.success = success;
    metric.error = error;

    this.logMetric(metric);

    // Remove from map after logging
    this.metrics.delete(name);

    return duration;
  }

  /**
   * Log a performance metric
   */
  private logMetric(metric: PerformanceMetric): void {
    const status = metric.success ? '✓' : '✗';
    const durationStr = `${metric.duration}ms`;
    const errorStr = metric.error ? ` [${metric.error}]` : '';

    log.info(
      'PERFORMANCE',
      `${status} ${metric.name}: ${durationStr}${errorStr}`,
      metric.metadata
    );
  }

  /**
   * Measure an async function
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);

    try {
      const result = await fn();
      this.end(name, true);
      return result;
    } catch (error) {
      this.end(name, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Measure a synchronous function
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.start(name, metadata);

    try {
      const result = fn();
      this.end(name, true);
      return result;
    } catch (error) {
      this.end(name, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get all active metrics
   */
  getActiveMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Singleton instance
export const perf = new PerformanceMonitor();

/**
 * Performance markers for common operations
 */
export const PerformanceMarkers = {
  // App lifecycle
  APP_START: 'app_start',
  APP_READY: 'app_ready',
  SCREEN_MOUNT: 'screen_mount',

  // Auth
  AUTH_INIT: 'auth_init',
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_REGISTER: 'auth_register',

  // Firebase
  FIRESTORE_QUERY: 'firestore_query',
  FIRESTORE_WRITE: 'firestore_write',
  FIRESTORE_BATCH: 'firestore_batch',

  // API
  API_REQUEST: 'api_request',
  API_UPLOAD: 'api_upload',

  // Navigation
  NAVIGATE: 'navigate',
  NAVIGATE_BACK: 'navigate_back',

  // Storage
  STORAGE_GET: 'storage_get',
  STORAGE_SET: 'storage_set',
  STORAGE_CLEAR: 'storage_clear',

  // Images
  IMAGE_LOAD: 'image_load',
  IMAGE_CROP: 'image_crop',

  // Video
  VIDEO_LOAD: 'video_load',
  VIDEO_PLAY: 'video_play',
};

/**
 * Higher-order function to measure performance
 */
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    perf.start(name);
    try {
      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result
          .then(data => {
            perf.end(name, true);
            return data;
          })
          .catch(error => {
            perf.end(name, false, error.message);
            throw error;
          });
      }

      // Handle sync functions
      perf.end(name, true);
      return result;
    } catch (error) {
      perf.end(name, false, (error as Error).message);
      throw error;
    }
  }) as T;
}

/**
 * Measure component render time
 */
export function useRenderTime(componentName: string): () => number | undefined {
  if (!__DEV__) {
    return () => undefined;
  }

  const startTime = Date.now();

  return () => {
    const duration = Date.now() - startTime;
    log.info('RENDER', `${componentName} rendered in ${duration}ms`);
    return duration;
  };
}

/**
 * FPS monitor for tracking frame rate
 */
export class FPSMonitor {
  private frameTimes: number[] = [];
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  start(callback: (fps: number) => void, sampleInterval: number = 1000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    let lastFrameTime = Date.now();

    this.intervalId = setInterval(() => {
      const now = Date.now();
      const fps = this.calculateFPS();
      callback(fps);
      this.frameTimes = [];
      lastFrameTime = now;
    }, sampleInterval);

    // Track frame times
    const trackFrame = () => {
      if (!this.isRunning) return;
      this.frameTimes.push(Date.now() - lastFrameTime);
      lastFrameTime = Date.now();
      requestAnimationFrame(trackFrame);
    };

    requestAnimationFrame(trackFrame);
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private calculateFPS(): number {
    if (this.frameTimes.length === 0) return 0;

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avgFrameTime);
  }
}

/**
 * Memory usage monitor (development only)
 */
export async function logMemoryUsage(tag: string = 'MEMORY'): Promise<void> {
  if (!__DEV__) return;

  try {
    // Note: Native memory monitoring requires native modules
    // This is a placeholder for React Native's memory API
    log.info(tag, 'Memory usage logging not available in JS');
  } catch (error) {
    log.error('MEMORY', 'Failed to log memory usage', error);
  }
}

/**
 * Performance alert system
 */
export class PerformanceAlerts {
  private thresholds: Record<string, number> = {
    slow_query: 1000, // 1 second
    slow_api: 3000, // 3 seconds
    slow_render: 100, // 100ms
    slow_navigation: 500, // 500ms
  };

  private alerts: string[] = [];

  check(name: string, duration: number): boolean {
    const threshold = this.thresholds[name] || this.thresholds.slow_query;

    if (duration > threshold) {
      const alert = `⚠️ ${name} took ${duration}ms (threshold: ${threshold}ms)`;
      this.alerts.push(alert);
      log.warn('PERF_ALERT', alert);
      return true;
    }

    return false;
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  setThreshold(name: string, value: number): void {
    this.thresholds[name] = value;
  }
}

export const perfAlerts = new PerformanceAlerts();

export default perf;
