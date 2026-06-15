/**
 * Performance Monitoring Module
 *
 * Tracks and reports performance metrics for the application
 * Integrates with Sentry for error tracking and performance monitoring
 */

import * as Sentry from "@sentry/react";
import { fisioLogger as logger } from "@/lib/errors/logger";

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
  navigation?: NavigationBreakdown;
}

interface NavigationBreakdown {
  ttfb: number;
  domInteractive: number;
  domContentLoaded: number;
  loadEventEnd: number;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
}

interface LcpAttribution {
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  route: string;
  element?: {
    tagName: string;
    id?: string;
    className?: string;
  };
  url?: string;
  size?: number;
  startTime: number;
  renderTime?: number;
  loadTime?: number;
  navigation?: NavigationBreakdown;
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
  private static hasReportedPoorLcp = false;

  /**
   * Track page load performance
   */
  static trackPageLoad(pageName: string): void {
    try {
      // Wait for page to fully load
      if (document.readyState === "complete") {
        this.capturePageLoadMetrics(pageName);
      } else {
        window.addEventListener("load", () => {
          this.capturePageLoadMetrics(pageName);
        });
      }
    } catch (error) {
      console.error("Error tracking page load:", error);
    }
  }

  private static capturePageLoadMetrics(pageName: string): void {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

    if (!navigation) return;

    const metrics: PageLoadMetrics = {
      page: pageName,
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      navigation: this.getNavigationBreakdown(navigation),
    };

    // Capture Web Vitals
    this.captureWebVitals(metrics);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log("📊 Page Load Metrics:", metrics);
    }

    // Send to analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_load", {
        page_name: pageName,
        load_time: metrics.loadTime,
        dom_content_loaded: metrics.domContentLoaded,
      });
    }

    // Alert if slow
    if (metrics.loadTime > this.SLOW_PAGE_LOAD_THRESHOLD) {
      logger.performance(
        "Slow page load",
        {
          pageName,
          loadTime: metrics.loadTime,
          navigation: metrics.navigation,
          route: window.location.pathname,
        },
        "performance",
      );

      Sentry.captureMessage(`Slow page load: ${pageName}`, {
        level: "warning",
        extra: metrics,
      });
    }
  }

  private static getNavigationBreakdown(
    navigation: PerformanceNavigationTiming,
  ): NavigationBreakdown {
    return {
      ttfb: navigation.responseStart - navigation.requestStart,
      domInteractive: navigation.domInteractive - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      loadEventEnd: navigation.loadEventEnd - navigation.fetchStart,
      transferSize: navigation.transferSize,
      encodedBodySize: navigation.encodedBodySize,
      decodedBodySize: navigation.decodedBodySize,
    };
  }

  private static getLcpRating(value: number): LcpAttribution["rating"] {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs-improvement";
    return "poor";
  }

  private static getLcpAttribution(
    entry: PerformanceEntry & {
      element?: Element;
      url?: string;
      size?: number;
      renderTime?: number;
      loadTime?: number;
    },
    metrics: PageLoadMetrics,
  ): LcpAttribution {
    const value = entry.renderTime ?? entry.loadTime ?? entry.startTime;
    const element = entry.element;
    const className =
      typeof element?.className === "string" ? element.className.slice(0, 160) : undefined;

    return {
      value,
      rating: this.getLcpRating(value),
      route: window.location.pathname,
      element: element
        ? {
            tagName: element.tagName.toLowerCase(),
            id: element.id || undefined,
            className,
          }
        : undefined,
      url: entry.url,
      size: entry.size,
      startTime: entry.startTime,
      renderTime: entry.renderTime,
      loadTime: entry.loadTime,
      navigation: metrics.navigation,
    };
  }

  /**
   * Capture Web Vitals (Core Web Vitals)
   */
  private static captureWebVitals(metrics: PageLoadMetrics): void {
    try {
      // First Paint (FP)
      const paintEntries = performance.getEntriesByType("paint");
      const firstPaint = paintEntries.find((entry) => entry.name === "first-paint");
      const firstContentfulPaint = paintEntries.find(
        (entry) => entry.name === "first-contentful-paint",
      );

      if (firstPaint) {
        metrics.firstPaint = firstPaint.startTime;
      }

      if (firstContentfulPaint) {
        metrics.firstContentfulPaint = firstContentfulPaint.startTime;
      }

      // Largest Contentful Paint (LCP) - Core Web Vital
      if ("PerformanceObserver" in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
            element?: Element;
            url?: string;
            size?: number;
            renderTime?: number;
            loadTime?: number;
          };
          const lcpAttribution = this.getLcpAttribution(lastEntry, metrics);
          metrics.largestContentfulPaint = lcpAttribution.value;

          // Good: < 2.5s, Needs Improvement: 2.5s - 4s, Poor: > 4s
          if (metrics.largestContentfulPaint > 4000 && !this.hasReportedPoorLcp) {
            this.hasReportedPoorLcp = true;
            logger.performance("Poor LCP", lcpAttribution, "performance");

            Sentry.captureMessage("Poor LCP", {
              level: "warning",
              extra: lcpAttribution,
            });
          }
        });

        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      }

      // First Input Delay (FID) - Core Web Vital
      if ("PerformanceObserver" in window) {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fid = entry as PerformanceEntry & { processingStart: number };
            metrics.firstInputDelay = fid.processingStart - entry.startTime;

            // Good: < 100ms, Needs Improvement: 100ms - 300ms, Poor: > 300ms
            if (metrics.firstInputDelay > 300) {
              logger.performance(
                "Poor FID",
                { value: metrics.firstInputDelay, route: window.location.pathname },
                "performance",
              );
            }
          });
        });

        fidObserver.observe({ type: "first-input", buffered: true });
      }

      // Cumulative Layout Shift (CLS) - Core Web Vital
      if ("PerformanceObserver" in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<
            PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          >) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value ?? 0;
            }
          }
          metrics.cumulativeLayoutShift = clsValue;

          // Good: < 0.1, Needs Improvement: 0.1 - 0.25, Poor: > 0.25
          if (clsValue > 0.25) {
            logger.performance(
              "Poor CLS",
              { value: clsValue, route: window.location.pathname },
              "performance",
            );
          }
        });

        clsObserver.observe({ type: "layout-shift", buffered: true });
      }
    } catch (error) {
      console.error("Error capturing Web Vitals:", error);
    }
  }

  /**
   * Track component render performance
   */
  static trackComponentRender(
    componentName: string,
    renderTime: number,
    props?: Record<string, unknown>,
  ): void {
    const metrics: ComponentRenderMetrics = {
      component: componentName,
      renderTime,
      props,
    };

    // Log in development
    if (import.meta.env.DEV && renderTime > this.SLOW_RENDER_THRESHOLD) {
      logger.performance(
        "Slow render",
        { componentName, renderTime, props },
        "performance",
      );
    }

    // Alert if very slow
    if (renderTime > this.SLOW_RENDER_THRESHOLD) {
      Sentry.captureMessage(`Slow component render: ${componentName}`, {
        level: "warning",
        extra: metrics,
      });
    }
  }

  /**
   * Track API call performance
   */
  static trackApiCall(endpoint: string, method: string, duration: number, status: number): void {
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
      const emoji = success ? "✅" : "❌";
      console.log(`${emoji} API ${method} ${endpoint}: ${duration}ms (${status})`);
    }

    // Send to analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "api_call", {
        endpoint,
        method,
        duration,
        status,
        success,
      });
    }

    // Alert if slow
    if (duration > this.SLOW_API_THRESHOLD) {
      logger.performance(
        "Slow API call",
        { method, endpoint, duration, status },
        "performance",
      );

      Sentry.captureMessage(`Slow API call: ${method} ${endpoint}`, {
        level: "warning",
        extra: metrics,
      });
    }

    // Alert if error
    if (!success) {
      Sentry.captureMessage(`API error: ${method} ${endpoint}`, {
        level: "error",
        extra: metrics,
      });
    }
  }

  /**
   * Measure function execution time
   */
  static measure<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
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
      memory: performance.memory,
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

export function withPerformanceTrace<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
  return PerformanceMonitor.measure(name, fn);
}

export function traceAIOperation<T>(
  model: string,
  operation: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return withPerformanceTrace(`ai:${model}:${operation}`, fn);
}

/**
 * Initialize performance monitoring for the application
 */
export function initPerformanceMonitoring() {
  PerformanceMonitor.trackPageLoad("initial_load");
}
