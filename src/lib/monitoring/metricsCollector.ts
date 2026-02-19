/**
 * Performance Metrics Collector
 * 
 * Centralized collection and reporting of performance metrics:
 * - Page load metrics
 * - Component render metrics
 * - Query performance metrics
 * - User interaction metrics
 * - Resource loading metrics
 */

import { fisioLogger as logger } from '@/lib/errors/logger';
import { trackMetric, MetricType } from './index';

export interface PageLoadMetrics {
  url: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
}

export interface ComponentMetrics {
  component: string;
  renderTime: number;
  renderCount: number;
  lastRenderTime: number;
}

export interface ResourceMetrics {
  name: string;
  type: string;
  duration: number;
  size: number;
  cached: boolean;
}

class MetricsCollector {
  private pageMetrics: PageLoadMetrics | null = null;
  private componentMetrics = new Map<string, ComponentMetrics>();
  private resourceMetrics: ResourceMetrics[] = [];
  private initialized = false;

  /**
   * Initialize metrics collection
   */
  initialize(): void {
    if (this.initialized) return;

    this.initialized = true;

    // Collect page load metrics
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        this.collectPageLoadMetrics();
      } else {
        window.addEventListener('load', () => {
          this.collectPageLoadMetrics();
        });
      }

      // Collect resource metrics
      this.observeResources();
    }
  }

  /**
   * Collect page load metrics
   */
  private collectPageLoadMetrics(): void {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (!navigation) return;

      this.pageMetrics = {
        url: window.location.href,
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      };

      // Collect paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find((e) => e.name === 'first-paint');
      const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');

      if (firstPaint) {
        this.pageMetrics.firstPaint = firstPaint.startTime;
      }

      if (fcp) {
        this.pageMetrics.firstContentfulPaint = fcp.startTime;
      }

      // Log metrics
      if (import.meta.env.DEV) {
        logger.debug('📊 Page Load Metrics', {
          loadTime: `${this.pageMetrics.loadTime.toFixed(0)}ms`,
          domContentLoaded: `${this.pageMetrics.domContentLoaded.toFixed(0)}ms`,
          firstPaint: this.pageMetrics.firstPaint ? `${this.pageMetrics.firstPaint.toFixed(0)}ms` : 'N/A',
          fcp: this.pageMetrics.firstContentfulPaint ? `${this.pageMetrics.firstContentfulPaint.toFixed(0)}ms` : 'N/A',
        });
      }

      // Track to monitoring service
      trackMetric(MetricType.PAGE_LOAD, this.pageMetrics);
    } catch (error) {
      logger.error('Failed to collect page load metrics', error);
    }
  }

  /**
   * Observe resource loading
   */
  private observeResources(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            const metric: ResourceMetrics = {
              name: resourceEntry.name,
              type: resourceEntry.initiatorType,
              duration: resourceEntry.duration,
              size: resourceEntry.transferSize || 0,
              cached: resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0,
            };

            this.resourceMetrics.push(metric);

            // Keep only last 100 resources
            if (this.resourceMetrics.length > 100) {
              this.resourceMetrics.shift();
            }

            // Warn about slow resources
            if (import.meta.env.DEV && resourceEntry.duration > 1000) {
              logger.warn(`🐌 Slow resource: ${resourceEntry.name}`, {
                duration: `${resourceEntry.duration.toFixed(0)}ms`,
                size: `${(resourceEntry.transferSize / 1024).toFixed(2)}KB`,
                type: resourceEntry.initiatorType,
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      logger.debug('Resource observer not supported', error);
    }
  }

  /**
   * Record component render
   */
  recordComponentRender(component: string, duration: number): void {
    const existing = this.componentMetrics.get(component);

    if (existing) {
      existing.renderCount++;
      existing.renderTime += duration;
      existing.lastRenderTime = duration;
    } else {
      this.componentMetrics.set(component, {
        component,
        renderTime: duration,
        renderCount: 1,
        lastRenderTime: duration,
      });
    }
  }

  /**
   * Get page load metrics
   */
  getPageMetrics(): PageLoadMetrics | null {
    return this.pageMetrics;
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(component?: string): ComponentMetrics | ComponentMetrics[] | null {
    if (component) {
      return this.componentMetrics.get(component) || null;
    }
    return Array.from(this.componentMetrics.values());
  }

  /**
   * Get resource metrics
   */
  getResourceMetrics(type?: string): ResourceMetrics[] {
    if (type) {
      return this.resourceMetrics.filter((r) => r.type === type);
    }
    return this.resourceMetrics;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    pageLoad: PageLoadMetrics | null;
    components: {
      total: number;
      slowest: ComponentMetrics | null;
      totalRenders: number;
    };
    resources: {
      total: number;
      cached: number;
      totalSize: number;
      slowest: ResourceMetrics | null;
    };
  } {
    const components = Array.from(this.componentMetrics.values());
    const slowestComponent = components.reduce<ComponentMetrics | null>(
      (slowest, current) =>
        !slowest || current.lastRenderTime > slowest.lastRenderTime ? current : slowest,
      null
    );

    const cachedResources = this.resourceMetrics.filter((r) => r.cached).length;
    const totalSize = this.resourceMetrics.reduce((sum, r) => sum + r.size, 0);
    const slowestResource = this.resourceMetrics.reduce<ResourceMetrics | null>(
      (slowest, current) =>
        !slowest || current.duration > slowest.duration ? current : slowest,
      null
    );

    return {
      pageLoad: this.pageMetrics,
      components: {
        total: components.length,
        slowest: slowestComponent,
        totalRenders: components.reduce((sum, c) => sum + c.renderCount, 0),
      },
      resources: {
        total: this.resourceMetrics.length,
        cached: cachedResources,
        totalSize,
        slowest: slowestResource,
      },
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.pageMetrics = null;
    this.componentMetrics.clear();
    this.resourceMetrics = [];
  }

  /**
   * Export metrics for analysis
   */
  export(): {
    pageMetrics: PageLoadMetrics | null;
    componentMetrics: ComponentMetrics[];
    resourceMetrics: ResourceMetrics[];
    timestamp: number;
  } {
    return {
      pageMetrics: this.pageMetrics,
      componentMetrics: Array.from(this.componentMetrics.values()),
      resourceMetrics: this.resourceMetrics,
      timestamp: Date.now(),
    };
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Auto-initialize
if (typeof window !== 'undefined') {
  metricsCollector.initialize();
}

// Expose globally in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__metricsCollector = metricsCollector;
  logger.debug('💡 Metrics Collector available at window.__metricsCollector');
}
