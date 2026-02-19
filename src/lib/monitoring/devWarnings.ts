/**
 * Development Mode Performance Warnings
 * 
 * Provides real-time warnings for performance issues during development:
 * - Slow renders
 * - Excessive re-renders
 * - Large bundle chunks
 * - Memory leaks
 * - Unoptimized images
 */

import { fisioLogger as logger } from '@/lib/errors/logger';

const IS_DEV = import.meta.env.DEV;

interface RenderWarning {
  component: string;
  renderCount: number;
  lastWarningTime: number;
}

const renderWarnings = new Map<string, RenderWarning>();
const EXCESSIVE_RENDER_THRESHOLD = 10;
const WARNING_COOLDOWN = 5000; // 5 seconds

/**
 * Warn about slow component render
 */
export function warnSlowRender(componentName: string, duration: number): void {
  if (!IS_DEV) return;

  const threshold = 16; // 60fps threshold
  if (duration > threshold) {
    const severity = duration > 100 ? '🔴' : duration > 50 ? '🟡' : '⚠️';
    logger.warn(
      `${severity} Slow render: ${componentName} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
      {
        component: componentName,
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        suggestion: duration > 100 
          ? 'Consider code splitting, memoization, or virtualization'
          : 'Consider using React.memo or optimizing expensive computations',
      }
    );
  }
}

/**
 * Warn about excessive re-renders
 */
export function warnExcessiveRenders(componentName: string): void {
  if (!IS_DEV) return;

  const now = Date.now();
  const warning = renderWarnings.get(componentName);

  if (!warning) {
    renderWarnings.set(componentName, {
      component: componentName,
      renderCount: 1,
      lastWarningTime: now,
    });
    return;
  }

  warning.renderCount++;

  // Warn if excessive renders and cooldown has passed
  if (
    warning.renderCount > EXCESSIVE_RENDER_THRESHOLD &&
    now - warning.lastWarningTime > WARNING_COOLDOWN
  ) {
    logger.warn(
      `🔄 Excessive re-renders: ${componentName} rendered ${warning.renderCount} times`,
      {
        component: componentName,
        renderCount: warning.renderCount,
        suggestion: 'Check if props/state are changing unnecessarily. Consider using React.memo, useMemo, or useCallback.',
      }
    );

    warning.lastWarningTime = now;
    warning.renderCount = 0; // Reset counter after warning
  }
}

/**
 * Warn about large state objects
 */
export function warnLargeState(componentName: string, stateSize: number): void {
  if (!IS_DEV) return;

  const threshold = 1000; // 1KB
  if (stateSize > threshold) {
    logger.warn(
      `📦 Large state object in ${componentName}: ${(stateSize / 1024).toFixed(2)}KB`,
      {
        component: componentName,
        size: `${(stateSize / 1024).toFixed(2)}KB`,
        threshold: `${(threshold / 1024).toFixed(2)}KB`,
        suggestion: 'Consider normalizing state, using context, or moving to server state with TanStack Query',
      }
    );
  }
}

/**
 * Warn about missing memoization
 */
export function warnMissingMemoization(
  componentName: string,
  propName: string,
  propType: 'object' | 'array' | 'function'
): void {
  if (!IS_DEV) return;

  logger.warn(
    `🎯 Potential optimization: ${componentName} receives new ${propType} prop "${propName}" on every render`,
    {
      component: componentName,
      prop: propName,
      type: propType,
      suggestion: `Consider wrapping ${propName} with ${propType === 'function' ? 'useCallback' : 'useMemo'} in parent component`,
    }
  );
}

/**
 * Warn about unoptimized images
 */
export function warnUnoptimizedImage(src: string, size: number): void {
  if (!IS_DEV) return;

  const threshold = 500 * 1024; // 500KB
  if (size > threshold) {
    logger.warn(
      `🖼️ Large image detected: ${src} (${(size / 1024 / 1024).toFixed(2)}MB)`,
      {
        src,
        size: `${(size / 1024 / 1024).toFixed(2)}MB`,
        threshold: `${(threshold / 1024 / 1024).toFixed(2)}MB`,
        suggestion: 'Consider using WebP format, lazy loading, or responsive images',
      }
    );
  }
}

/**
 * Warn about memory leaks
 */
export function warnPotentialMemoryLeak(
  componentName: string,
  leakType: 'event-listener' | 'interval' | 'timeout' | 'subscription'
): void {
  if (!IS_DEV) return;

  logger.warn(
    `💧 Potential memory leak in ${componentName}: ${leakType} not cleaned up`,
    {
      component: componentName,
      leakType,
      suggestion: 'Ensure cleanup in useEffect return function or component unmount',
    }
  );
}

/**
 * Warn about blocking operations
 */
export function warnBlockingOperation(
  operationName: string,
  duration: number
): void {
  if (!IS_DEV) return;

  const threshold = 50; // 50ms blocks the main thread
  if (duration > threshold) {
    logger.warn(
      `⏸️ Blocking operation: ${operationName} blocked main thread for ${duration.toFixed(2)}ms`,
      {
        operation: operationName,
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        suggestion: 'Consider using Web Workers, async operations, or breaking into smaller chunks',
      }
    );
  }
}

/**
 * Warn about large bundle chunks
 */
export function warnLargeChunk(chunkName: string, size: number): void {
  if (!IS_DEV) return;

  const threshold = 200 * 1024; // 200KB
  if (size > threshold) {
    logger.warn(
      `📦 Large bundle chunk: ${chunkName} (${(size / 1024).toFixed(2)}KB)`,
      {
        chunk: chunkName,
        size: `${(size / 1024).toFixed(2)}KB`,
        threshold: `${(threshold / 1024).toFixed(2)}KB`,
        suggestion: 'Consider further code splitting or lazy loading',
      }
    );
  }
}

/**
 * Warn about inefficient queries
 */
export function warnInefficientQuery(
  queryKey: string,
  issue: 'no-cache' | 'frequent-refetch' | 'large-response'
): void {
  if (!IS_DEV) return;

  const messages = {
    'no-cache': 'Query is not using cache effectively',
    'frequent-refetch': 'Query is refetching too frequently',
    'large-response': 'Query response is very large',
  };

  const suggestions = {
    'no-cache': 'Configure appropriate staleTime and gcTime',
    'frequent-refetch': 'Increase staleTime or disable refetchOnWindowFocus',
    'large-response': 'Consider pagination, filtering, or selecting specific fields',
  };

  logger.warn(
    `🔍 Inefficient query: ${queryKey} - ${messages[issue]}`,
    {
      queryKey,
      issue,
      suggestion: suggestions[issue],
    }
  );
}

/**
 * Clear all warnings (useful for testing)
 */
export function clearWarnings(): void {
  renderWarnings.clear();
}

/**
 * Get render statistics
 */
export function getRenderStats(): Array<{
  component: string;
  renderCount: number;
}> {
  return Array.from(renderWarnings.values()).map((w) => ({
    component: w.component,
    renderCount: w.renderCount,
  }));
}
