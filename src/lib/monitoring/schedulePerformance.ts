/**
 * Schedule Performance Monitoring
 * 
 * Specialized performance monitoring for the Schedule page including:
 * - Web Vitals tracking (LCP, INP, CLS)
 * - Frame rate monitoring for drag operations
 * - View switch timing
 * - Cache hit rate tracking
 * 
 * Note: Uses INP (Interaction to Next Paint) instead of FID as per web-vitals v3+
 * 
 * Validates Requirements 9.1, 9.2, 9.4
 * 
 * @module lib/monitoring/schedulePerformance
 */

import { onLCP, onINP, onCLS, Metric } from 'web-vitals';
import { trackMetric, MetricType } from './index';

/**
 * Performance thresholds for warnings
 */
export const PERFORMANCE_THRESHOLDS = {
  LCP: 2500, // 2.5s
  INP: 200, // 200ms (replaces FID in web-vitals v3+)
  CLS: 0.1, // 0.1
  VIEW_SWITCH: 100, // 100ms
  DRAG_FPS: 60, // 60fps
} as const;

/**
 * Schedule-specific performance metrics
 */
export interface SchedulePerformanceMetrics {
  lcp?: number;
  inp?: number; // Interaction to Next Paint (replaces FID)
  cls?: number;
  viewSwitchTime?: number;
  dragFrameRate?: number;
  cacheHitRate?: number;
  renderCount?: number;
}

/**
 * Frame rate monitor for drag operations
 */
export class DragFrameRateMonitor {
  private frameCount = 0;
  private startTime = 0;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private isMonitoring = false;
  private frameRates: number[] = [];

  /**
   * Start monitoring frame rate
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.frameCount = 0;
    this.frameRates = [];
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.measureFrame();
  }

  /**
   * Stop monitoring and return average FPS
   */
  stop(): number {
    if (!this.isMonitoring) return 0;

    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const avgFps = this.frameRates.length > 0
      ? this.frameRates.reduce((sum, fps) => sum + fps, 0) / this.frameRates.length
      : 0;

    // Track metric
    trackMetric(MetricType.PAGE_LOAD, {
      metric: 'drag_frame_rate',
      avgFps,
      minFps: Math.min(...this.frameRates),
      maxFps: Math.max(...this.frameRates),
      frameCount: this.frameCount,
      duration: performance.now() - this.startTime,
    });

    // Log warning if below threshold
    if (import.meta.env.DEV && avgFps < PERFORMANCE_THRESHOLDS.DRAG_FPS) {
      console.warn(
        `[Schedule Performance] Drag frame rate below threshold: ${avgFps.toFixed(2)} FPS (expected: ${PERFORMANCE_THRESHOLDS.DRAG_FPS} FPS)`
      );
    }

    return avgFps;
  }

  /**
   * Measure individual frame
   */
  private measureFrame = (): void => {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const frameDuration = currentTime - this.lastFrameTime;

    if (frameDuration > 0) {
      const fps = 1000 / frameDuration;
      this.frameRates.push(fps);
    }

    this.frameCount++;
    this.lastFrameTime = currentTime;
    this.animationFrameId = requestAnimationFrame(this.measureFrame);
  };

  /**
   * Get current FPS (for real-time display)
   */
  getCurrentFps(): number {
    if (this.frameRates.length === 0) return 0;
    return this.frameRates[this.frameRates.length - 1];
  }

  /**
   * Check if currently monitoring
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}

/**
 * View switch timing tracker
 */
export class ViewSwitchTimer {
  private startTime = 0;
  private viewType: 'day' | 'week' | 'month' | null = null;

  /**
   * Start timing a view switch
   */
  start(viewType: 'day' | 'week' | 'month'): void {
    this.startTime = performance.now();
    this.viewType = viewType;
  }

  /**
   * End timing and track metric
   */
  end(): number {
    if (this.startTime === 0) return 0;

    const duration = performance.now() - this.startTime;

    // Track metric
    trackMetric(MetricType.PAGE_LOAD, {
      metric: 'view_switch',
      viewType: this.viewType,
      duration,
    });

    // Log warning if exceeds threshold
    if (import.meta.env.DEV && duration > PERFORMANCE_THRESHOLDS.VIEW_SWITCH) {
      console.warn(
        `[Schedule Performance] View switch exceeded threshold: ${duration.toFixed(2)}ms (expected: <${PERFORMANCE_THRESHOLDS.VIEW_SWITCH}ms)`
      );
    }

    // Reset
    this.startTime = 0;
    this.viewType = null;

    return duration;
  }
}

/**
 * Cache hit rate tracker
 */
export class CacheHitRateTracker {
  private hits = 0;
  private misses = 0;

  /**
   * Record a cache hit
   */
  recordHit(): void {
    this.hits++;
    this.trackRate();
  }

  /**
   * Record a cache miss
   */
  recordMiss(): void {
    this.misses++;
    this.trackRate();
  }

  /**
   * Get current hit rate (0-1)
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Get hit rate as percentage
   */
  getHitRatePercentage(): number {
    return this.getHitRate() * 100;
  }

  /**
   * Reset counters
   */
  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Track rate periodically
   */
  private trackRate(): void {
    const total = this.hits + this.misses;
    
    // Track every 10 requests
    if (total % 10 === 0) {
      trackMetric(MetricType.PAGE_LOAD, {
        metric: 'cache_hit_rate',
        hitRate: this.getHitRate(),
        hits: this.hits,
        misses: this.misses,
        total,
      });
    }
  }
}

/**
 * Initialize Web Vitals tracking for Schedule page
 */
export function initScheduleWebVitals(): void {
  // Track LCP (Largest Contentful Paint)
  onLCP((metric: Metric) => {
    trackMetric(MetricType.PAGE_LOAD, {
      metric: 'LCP',
      value: metric.value,
      rating: metric.rating,
      page: 'schedule',
    });

    // Log warning if exceeds threshold
    if (import.meta.env.DEV && metric.value > PERFORMANCE_THRESHOLDS.LCP) {
      console.warn(
        `[Schedule Performance] LCP exceeded threshold: ${metric.value.toFixed(2)}ms (expected: <${PERFORMANCE_THRESHOLDS.LCP}ms)`
      );
    }
  });

  // Track INP (Interaction to Next Paint - replaces FID in web-vitals v3+)
  onINP((metric: Metric) => {
    trackMetric(MetricType.PAGE_LOAD, {
      metric: 'INP',
      value: metric.value,
      rating: metric.rating,
      page: 'schedule',
    });

    // Log warning if exceeds threshold
    if (import.meta.env.DEV && metric.value > PERFORMANCE_THRESHOLDS.INP) {
      console.warn(
        `[Schedule Performance] INP exceeded threshold: ${metric.value.toFixed(2)}ms (expected: <${PERFORMANCE_THRESHOLDS.INP}ms)`
      );
    }
  });

  // Track CLS (Cumulative Layout Shift)
  onCLS((metric: Metric) => {
    trackMetric(MetricType.PAGE_LOAD, {
      metric: 'CLS',
      value: metric.value,
      rating: metric.rating,
      page: 'schedule',
    });

    // Log warning if exceeds threshold
    if (import.meta.env.DEV && metric.value > PERFORMANCE_THRESHOLDS.CLS) {
      console.warn(
        `[Schedule Performance] CLS exceeded threshold: ${metric.value.toFixed(4)} (expected: <${PERFORMANCE_THRESHOLDS.CLS})`
      );
    }
  });
}

/**
 * Singleton instances for global use
 */
export const dragFrameRateMonitor = new DragFrameRateMonitor();
export const viewSwitchTimer = new ViewSwitchTimer();
export const cacheHitRateTracker = new CacheHitRateTracker();

/**
 * Hook for tracking schedule performance in React components
 */
export function useSchedulePerformance() {
  return {
    dragFrameRateMonitor,
    viewSwitchTimer,
    cacheHitRateTracker,
    initWebVitals: initScheduleWebVitals,
  };
}

/**
 * Get all current performance metrics
 */
export function getSchedulePerformanceMetrics(): SchedulePerformanceMetrics {
  return {
    dragFrameRate: dragFrameRateMonitor.getCurrentFps(),
    cacheHitRate: cacheHitRateTracker.getHitRate(),
  };
}

/**
 * Log performance summary (for debugging)
 */
export function logPerformanceSummary(): void {
  if (!import.meta.env.DEV) return;

  const metrics = getSchedulePerformanceMetrics();
  
  console.group('[Schedule Performance Summary]');
  console.log('Cache Hit Rate:', `${cacheHitRateTracker.getHitRatePercentage().toFixed(2)}%`);
  
  if (metrics.dragFrameRate) {
    console.log('Current Drag FPS:', metrics.dragFrameRate.toFixed(2));
  }
  
  console.groupEnd();
}
