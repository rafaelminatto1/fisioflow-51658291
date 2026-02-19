/**
 * Enhanced Core Web Vitals Tracking
 * 
 * Tracks and reports Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay) / INP (Interaction to Next Paint)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */

import type { Metric } from 'web-vitals';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { trackMetric, MetricType } from './index';

export interface CoreWebVitalsMetrics {
  lcp?: number;
  fid?: number;
  inp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

const metrics: CoreWebVitalsMetrics = {};

/**
 * Initialize Core Web Vitals tracking
 */
export async function initCoreWebVitals(): Promise<void> {
  try {
    const { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    // Track LCP (Largest Contentful Paint)
    onLCP((metric: Metric) => {
      metrics.lcp = metric.value;
      reportMetric('LCP', metric);
    });

    // Track FID (First Input Delay)
    onFID((metric: Metric) => {
      metrics.fid = metric.value;
      reportMetric('FID', metric);
    });

    // Track INP (Interaction to Next Paint) - modern replacement for FID
    if (onINP) {
      onINP((metric: Metric) => {
        metrics.inp = metric.value;
        reportMetric('INP', metric);
      });
    }

    // Track CLS (Cumulative Layout Shift)
    onCLS((metric: Metric) => {
      metrics.cls = metric.value;
      reportMetric('CLS', metric);
    });

    // Track FCP (First Contentful Paint)
    onFCP((metric: Metric) => {
      metrics.fcp = metric.value;
      reportMetric('FCP', metric);
    });

    // Track TTFB (Time to First Byte)
    onTTFB((metric: Metric) => {
      metrics.ttfb = metric.value;
      reportMetric('TTFB', metric);
    });

    logger.debug('✅ Core Web Vitals tracking initialized');
  } catch (error) {
    logger.error('Failed to initialize Core Web Vitals tracking', error);
  }
}

/**
 * Report a metric
 */
function reportMetric(name: string, metric: Metric): void {
  const rating = getRating(name, metric.value);
  const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';

  // Log in development
  if (import.meta.env.DEV) {
    logger.debug(`${emoji} ${name}: ${formatValue(name, metric.value)} (${rating})`);
  }

  // Track to monitoring service
  trackMetric(MetricType.PAGE_LOAD, {
    metric: name,
    value: metric.value,
    rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Warn if poor performance
  if (rating === 'poor') {
    logger.warn(`Poor ${name} detected: ${formatValue(name, metric.value)}`, {
      metric: name,
      value: metric.value,
      threshold: getThreshold(name),
    });
  }
}

/**
 * Get rating for a metric
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = getThreshold(name);
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Get thresholds for a metric
 */
function getThreshold(name: string): { good: number; needsImprovement: number } {
  const thresholds: Record<string, { good: number; needsImprovement: number }> = {
    LCP: { good: 2500, needsImprovement: 4000 },
    FID: { good: 100, needsImprovement: 300 },
    INP: { good: 200, needsImprovement: 500 },
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FCP: { good: 1800, needsImprovement: 3000 },
    TTFB: { good: 800, needsImprovement: 1800 },
  };
  return thresholds[name] || { good: 0, needsImprovement: 0 };
}

/**
 * Format metric value for display
 */
function formatValue(name: string, value: number): string {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

/**
 * Get current metrics
 */
export function getCoreWebVitals(): CoreWebVitalsMetrics {
  return { ...metrics };
}

/**
 * Check if metrics meet performance budgets
 */
export function checkPerformanceBudgets(): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (metrics.lcp && metrics.lcp > 2500) {
    violations.push(`LCP: ${metrics.lcp}ms (budget: 2500ms)`);
  }

  if (metrics.fid && metrics.fid > 100) {
    violations.push(`FID: ${metrics.fid}ms (budget: 100ms)`);
  }

  if (metrics.inp && metrics.inp > 200) {
    violations.push(`INP: ${metrics.inp}ms (budget: 200ms)`);
  }

  if (metrics.cls && metrics.cls > 0.1) {
    violations.push(`CLS: ${metrics.cls.toFixed(3)} (budget: 0.1)`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
