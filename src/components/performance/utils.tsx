/**
 * Performance Utilities for React Components
 *
 * @description
 * Common hooks and utilities for optimizing React component performance
 *
 * @module components/performance/utils
 */

import { useCallback, useRef, useEffect } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Custom hook that returns a memoized callback with debounce
 * Useful for search inputs, scroll handlers, etc.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Memoized debounced function
 *
 * @example
 * ```tsx
 * const handleChange = useDebouncedCallback((value: string) => {
 *   setSearchQuery(value);
 * }, 300);
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]) as T;
}

/**
 * Custom hook for deferring value updates
 * Delays setting a value until after the current render cycle
 *
 * @param value - Value to defer
 * @returns Deferred value
 *
 * @example
 * ```tsx
 * const [isExpanded, setIsExpanded] = useState(false);
 * const deferExpansion = useDeferredValue(isExpanded);
 * // Use deferExpansion in render to avoid blocking
 * ```
 */
export function useDeferredValue<T>(value: T): T {
  const [deferred, setDeferred] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDeferred(value), 0);
    return () => clearTimeout(timer);
  }, [value]);

  return deferred;
}

/**
 * Custom hook for tracking component render count
 * Useful for performance debugging and detecting unnecessary re-renders
 *
 * @param name - Component name for logging
 * @returns Render count
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renders = useRenderCount('MyComponent');
 *   // In development: console.log when renders > 10
 * }
 * ```
 */
export function useRenderCount(name: string): number {
  const renderCount = useRef(0);
  renderCount.current += 1;

  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug(`[Perf] ${name} rendered ${renderCount.current} times`, undefined, 'useRenderCount');
    }
  });

  return renderCount.current;
}

/**
 * Custom hook for measuring render time
 * Uses Performance API to measure component render performance
 *
 * @param name - Component name for logging
 * @returns Object with start and end methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const perf = useRenderPerf('MyComponent');
 *   perf.start();
 *   // ... component renders
 *   perf.end();
 * }
 * ```
 */
export function useRenderPerf(name: string) {
  const startTimeRef = useRef<number>();

  const start = useCallback(() => {
    if (import.meta.env.DEV) {
      startTimeRef.current = performance.now();
    }
  }, []);

  const end = useCallback(() => {
    if (import.meta.env.DEV && startTimeRef.current) {
      const duration = performance.now() - startTimeRef.current;
      logger.debug(`[Perf] ${name} rendered in ${duration.toFixed(2)}ms`, undefined, 'useRenderTime');
    }
  }, [name]);

  return { start, end };
}

/**
 * Custom hook for lazy loading components with intersection observer
 *
 * @param threshold - Intersection threshold (0-1)
 * @returns Object with ref and isVisible
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { ref, isVisible } = useLazyLoad(0.1);
 *   return (
 *     <div ref={ref}>
 *       {isVisible ? <HeavyComponent /> : <Placeholder />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoad(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    const current = ref.current;
    if (current) {
      observer.observe(current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/**
 * Memoization helper for expensive computations
 * Like useMemo but with custom comparison
 *
 * @param factory - Function that computes value
 * @param deps - Dependencies
 * @param isEqual - Custom comparison function
 * @returns Memoized value
 *
 * @example
 * ```tsx
 * const sortedList = useCustomMemo(
 *   () => items.sort((a, b) => a.id - b.id),
 *   [items],
 *   (a, b) => a.length === b.length && a.every((item, i) => item.id === b[i].id)
 * );
 * ```
 */
export function useCustomMemo<T>(
  factory: () => T,
  deps: unknown[],
  isEqual: (prev: T, next: T) => boolean
): T {
  const ref = useRef<{ value: T; deps: unknown[] }>({ value: factory() as T, deps });

  // Only recompute if deps changed
  if (!isEqual(ref.current.deps, deps)) {
    ref.current.value = factory();
    ref.current.deps = deps;
  }

  return ref.current.value;
}

/**
 * HoC for performance monitoring
 * Logs render performance for the wrapped component
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const renders = useRenderCount(componentName || Component.name);
    const perf = useRenderPerf(componentName || Component.name);

    perf.start();

    React.useEffect(() => {
      perf.end();
    });

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${
    componentName || Component.name
  })`;

  return WrappedComponent;
}
