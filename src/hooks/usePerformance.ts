/**
 * Performance Monitoring Hooks
 * 
 * React hooks for tracking component and page performance
 */

import { useEffect, useRef } from 'react';
import { performanceMonitor } from '@/lib/monitoring/performance';

/**
 * Track page load performance
 */
export function usePageLoadTracking(pageName: string) {
  useEffect(() => {
    performanceMonitor.trackPageLoad(pageName);
  }, [pageName]);
}

/**
 * Track component render performance
 */
export function useRenderTracking(componentName: string, props?: Record<string, unknown>) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - startTime.current;
    
    performanceMonitor.trackComponentRender(componentName, renderTime, {
      ...props,
      renderCount: renderCount.current,
    });
    
    startTime.current = performance.now();
  });
}

/**
 * Measure async operation performance
 */
export function useMeasureAsync<T>(
  operationName: string,
  asyncFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const duration = performance.now() - start;
      
      performanceMonitor.trackComponentRender(operationName, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  };
}

/**
 * Track API call performance
 */
export function useApiTracking() {
  return {
    trackCall: (
      endpoint: string,
      method: string,
      duration: number,
      status: number
    ) => {
      performanceMonitor.trackApiCall(endpoint, method, duration, status);
    },
  };
}

/**
 * Get current performance metrics
 */
export function usePerformanceMetrics() {
  return performanceMonitor.getCurrentMetrics();
}
