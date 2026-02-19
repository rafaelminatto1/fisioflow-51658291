/**
 * Performance Monitoring Module
 * 
 * Tracks and reports performance metrics for the application
 * Integrates with Sentry for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';

interface PageLoadMetrics {
  page: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

interface ComponentRenderMetrics {
  component: string;
  renderTime: number;
  props?: Record<string, unknown>;
}

interface ApiCallMetrics {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  success: boolean;
}

export class PerformanceMonitor {
  private static readonly SLOW_RENDER_THRESHOLD = 100; // ms
  private static readonly SLOW_API_THRESHOLD = 1000; // ms
  private static readonly SLOW_PAGE_LOAD_THRESHOLD = 3000; // ms

  /**
   * Track page load performance
   */
  static trackPageLoad(pageName: string): void {
    try {
      // Wait for page to fully load
      if (document.readyState === 'complete') {
        this.capturePageLoadMetrics(pageName);
      } else {
        window.addEventListener('load', () => {
          this.capturePageLoadMetrics(pageName);
        });
      }
    } catch (error) {
      console.error('Error tracking page load:', error);
    }
  }

  private static capturePageLoadMetrics(pageName: string): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (!navigation) return;

    const metrics: PageLoadMetrics = {
      page: pageName,
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
    };

    // Capture Web Vitals
    this.captureWebVitals(metrics);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('📊 Page Load Metrics:', metrics);
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_load', {
        page_name: pageName,
        load_time: metrics.loadTime,
        dom_content_loaded: metrics.domContentLoaded,
      });
    }

    // Alert if slow
    if (metrics.loadTime > this.SLOW_PAGE_LOAD_THRESHOLD) {
      console.warn(`⚠️ Slow page load: ${pageName} took ${metrics.loadTime}ms`);
      
      Sentry.captureMessage(`Slow page load: ${pageName}`, {
        level: 'warning',
        extra: metrics,
      });
    }
  }

  /**
   * Capture Web Vitals (Core Web Vitals)
   */
  private static captureWebVitals(metrics: PageLoadMetrics): void {
    try {
      // First Paint (FP)
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');

      if (firstPaint) {
        metrics.firstPaint = firstPaint.startTime;
      }

      if (firstContentfulPaint) {
        metrics.firstContentfulPaint = firstContentfulPaint.startTime;
      }

      // Largest Contentful Paint (LCP) - Core Web Vital
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
          
          // Good: < 2.5s, Needs Improvement: 2.5s - 4s, Poor: > 4s
          if (metrics.largestContentfulPaint > 4000) {
            console.warn('⚠️ Poor LCP:', metrics.largestContentfulPaint);
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }

      // First Input Delay (FID) - Core Web Vital
      if ('PerformanceObserver' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            metrics.firstInputDelay = entry.processingStart - entry.startTime;
            
            // Good: < 100ms, Needs Improvement: 100ms - 300ms, Poor: > 300ms
            if (metrics.firstInputDelay > 300) {
              console.warn('⚠️ Poor FID:', metrics.firstInputDelay);
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
      }

      // Cumulative Layout Shift (CLS) - Core Web Vital
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          metrics.cumulativeLayoutShift = clsValue;
          
          // Good: < 0.1, Needs Improvement: 0.1 - 0.25, Poor: > 0.25
          if (clsValue > 0.25) {
            console.warn('⚠️ Poor CLS:', clsValue);
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
      }
    } catch (error) {
      console.error('Error capturing Web Vitals:', error);
    }
  }

  /**
   * Track component render performance
   */
  static trackComponentRender(
    componentName: string,
    renderTime: number,
    props?: Record<string, unknown>
  ): void {
    const metrics: ComponentRenderMetrics = {
      component: componentName,
      renderTime,
      props,
    };

    // Log in development
    if (import.meta.env.DEV && renderTime > this.SLOW_RENDER_THRESHOLD) {
      console.warn(`⚠️ Slow render: ${componentName} took ${renderTime}ms`, props);
    }

    // Alert if very slow
    if (renderTime > this.SLOW_RENDER_THRESHOLD) {
      Sentry.captureMessage(`Slow component render: ${componentName}`, {
        level: 'warning',
        extra: metrics,
      });
    }
  }

  /**
   * Track API call performance
   */
  static trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ): void {
    const success = status >= 200 && status < 300;
    
    const metrics: ApiCallMetrics = {
      endpoint,
      method,
      duration,
      status,
      success,
    };

    // Log in development
    if (import.meta.env.DEV) {
      const emoji = success ? '✅' : '❌';
      console.log(`${emoji} API ${method} ${endpoint}: ${duration}ms (${status})`);
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'api_call', {
        endpoint,
        method,
        duration,
        status,
        success,
      });
    }

    // Alert if slow
    if (duration > this.SLOW_API_THRESHOLD) {
      console.warn(`⚠️ Slow API call: ${method} ${endpoint} took ${duration}ms`);
      
      Sentry.captureMessage(`Slow API call: ${method} ${endpoint}`, {
        level: 'warning',
        extra: metrics,
      });
    }

    // Alert if error
    if (!success) {
      Sentry.captureMessage(`API error: ${method} ${endpoint}`, {
        level: 'error',
        extra: metrics,
      });
    }
  }

  /**
   * Measure function execution time
   */
  static measure<T>(
    name: string,
    fn: () => T | Promise<T>
  ): T | Promise<T> {
    const start = performance.now();
    
    try {
      const result = fn();
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          this.trackComponentRender(name, duration);
        }) as T;
      }
      
      // Handle sync functions
      const duration = performance.now() - start;
      this.trackComponentRender(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Error in ${name} (${duration}ms):`, error);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  static getCurrentMetrics(): {
    memory?: MemoryInfo;
    timing: PerformanceTiming;
    navigation: PerformanceNavigation;
  } {
    return {
      memory: (performance as any).memory,
      timing: performance.timing,
      navigation: performance.navigation,
    };
  }

  /**
   * Clear performance marks and measures
   */
  static clearMarks(): void {
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Memory info interface
interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor;
