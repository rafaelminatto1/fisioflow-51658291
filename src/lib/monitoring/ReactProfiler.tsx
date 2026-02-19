/**
 * React Profiler Wrapper for Development
 * 
 * Wraps components with React Profiler to measure render performance
 * Only active in development mode
 */

import { Profiler, ProfilerOnRenderCallback, ReactNode } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { warnSlowRender, warnExcessiveRenders } from './devWarnings';
import { trackMetric, MetricType } from './index';

const IS_DEV = import.meta.env.DEV;

interface ProfilerWrapperProps {
  id: string;
  children: ReactNode;
  enabled?: boolean;
  logToConsole?: boolean;
  trackMetrics?: boolean;
}

/**
 * React Profiler wrapper component
 */
export function ProfilerWrapper({
  id,
  children,
  enabled = IS_DEV,
  logToConsole = IS_DEV,
  trackMetrics = true,
}: ProfilerWrapperProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  ) => {
    // Log to console in development
    if (logToConsole && actualDuration > 16) {
      logger.debug(`⚡ Profiler: ${id}`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        startTime: `${startTime.toFixed(2)}ms`,
        commitTime: `${commitTime.toFixed(2)}ms`,
        interactions: interactions.size,
      });
    }

    // Warn about slow renders
    if (actualDuration > 16) {
      warnSlowRender(id, actualDuration);
    }

    // Track excessive re-renders
    warnExcessiveRenders(id);

    // Track metrics
    if (trackMetrics) {
      trackMetric(MetricType.PAGE_LOAD, {
        component: id,
        phase,
        actualDuration,
        baseDuration,
      });
    }
  };

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

/**
 * HOC to wrap component with profiler
 */
export function withProfiler<P extends object>(
  Component: React.ComponentType<P>,
  id?: string
) {
  const componentName = id || Component.displayName || Component.name || 'Component';

  const ProfiledComponent = (props: P) => (
    <ProfilerWrapper id={componentName}>
      <Component {...props} />
    </ProfilerWrapper>
  );

  ProfiledComponent.displayName = `Profiled(${componentName})`;

  return ProfiledComponent;
}

/**
 * Hook to manually measure render performance
 */
export function useRenderPerformance(componentName: string, enabled = IS_DEV) {
  if (!enabled) return;

  const startTime = performance.now();

  // This will run after render
  queueMicrotask(() => {
    const duration = performance.now() - startTime;
    if (duration > 16) {
      warnSlowRender(componentName, duration);
    }
    warnExcessiveRenders(componentName);
  });
}

/**
 * Measure async operation performance
 */
export async function measureAsync<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    if (IS_DEV && duration > 1000) {
      logger.debug(`⏱️ Async operation: ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    trackMetric(MetricType.API_CALL, {
      operation: operationName,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    trackMetric(MetricType.API_CALL, {
      operation: operationName,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Measure sync operation performance
 */
export function measureSync<T>(
  operationName: string,
  operation: () => T
): T {
  const startTime = performance.now();

  try {
    const result = operation();
    const duration = performance.now() - startTime;

    if (IS_DEV && duration > 16) {
      logger.debug(`⏱️ Sync operation: ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    trackMetric(MetricType.PAGE_LOAD, {
      operation: operationName,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    trackMetric(MetricType.PAGE_LOAD, {
      operation: operationName,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
