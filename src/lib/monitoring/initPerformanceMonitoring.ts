/**
 * Initialize Performance Monitoring
 * 
 * Sets up all performance monitoring infrastructure:
 * - Core Web Vitals tracking
 * - Query performance tracking
 * - Metrics collection
 * - Development warnings
 */

import { QueryClient } from '@tanstack/react-query';
import { initCoreWebVitals } from './coreWebVitals';
import { configureQueryClientWithTracking } from './queryPerformance';
import { metricsCollector } from './metricsCollector';
import { fisioLogger as logger } from '@/lib/errors/logger';

let initialized = false;

/**
 * Initialize all performance monitoring
 */
export async function initPerformanceMonitoring(queryClient?: QueryClient): Promise<void> {
  if (initialized) {
    logger.debug('Performance monitoring already initialized');
    return;
  }

  try {
    logger.debug('🚀 Initializing performance monitoring...');

    // Initialize Core Web Vitals tracking
    await initCoreWebVitals();

    // Initialize metrics collector
    metricsCollector.initialize();

    // Configure QueryClient with tracking if provided
    if (queryClient) {
      configureQueryClientWithTracking(queryClient);
    }

    initialized = true;

    logger.debug('✅ Performance monitoring initialized successfully');

    // Log summary after page load
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          logPerformanceSummary();
        }, 1000);
      });
    }
  } catch (error) {
    logger.error('Failed to initialize performance monitoring', error);
  }
}

/**
 * Log performance summary
 */
function logPerformanceSummary(): void {
  if (!import.meta.env.DEV) return;

  const summary = metricsCollector.getSummary();

  logger.debug('📊 Performance Summary', {
    pageLoad: summary.pageLoad
      ? {
          loadTime: `${summary.pageLoad.loadTime.toFixed(0)}ms`,
          domContentLoaded: `${summary.pageLoad.domContentLoaded.toFixed(0)}ms`,
          fcp: summary.pageLoad.firstContentfulPaint
            ? `${summary.pageLoad.firstContentfulPaint.toFixed(0)}ms`
            : 'N/A',
        }
      : 'N/A',
    components: {
      total: summary.components.total,
      totalRenders: summary.components.totalRenders,
      slowest: summary.components.slowest
        ? `${summary.components.slowest.component} (${summary.components.slowest.lastRenderTime.toFixed(2)}ms)`
        : 'N/A',
    },
    resources: {
      total: summary.resources.total,
      cached: `${summary.resources.cached}/${summary.resources.total}`,
      totalSize: `${(summary.resources.totalSize / 1024 / 1024).toFixed(2)}MB`,
      slowest: summary.resources.slowest
        ? `${summary.resources.slowest.name} (${summary.resources.slowest.duration.toFixed(0)}ms)`
        : 'N/A',
    },
  });
}

/**
 * Check if monitoring is initialized
 */
export function isMonitoringInitialized(): boolean {
  return initialized;
}

/**
 * Reset monitoring (useful for testing)
 */
export function resetMonitoring(): void {
  initialized = false;
  metricsCollector.clear();
}
