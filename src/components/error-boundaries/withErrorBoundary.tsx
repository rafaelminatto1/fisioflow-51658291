/**
 * withErrorBoundary Higher-Order Component
 *
 * @description
 * HOC for wrapping any component with error boundary protection.
 *
 * @module components/error-boundaries/withErrorBoundary
 *
 * @example
 * ```tsx
 * const MyComponent = withErrorBoundary(function MyComponent() {
 *   return <div>My Component</div>;
 * }, {
 *   fallback: <div>Something went wrong</div>,
 *   onError: (error) => logger.error(error),
 * });
 * ```
 */

import React, { ComponentType, ReactNode } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';
import ErrorBoundary, { ErrorBoundaryProps } from './ErrorBoundary';

interface WithErrorBoundaryOptions {
  /** Custom fallback component or render prop */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Key to reset the boundary */
  resetKey?: string | number;
}

/**
 * HOC to wrap a component with error boundary
 *
 * @param Component - Component to wrap
 * @param options - Error boundary options
 * @returns Wrapped component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options?: WithErrorBoundaryOptions
): ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const { resetKey, ...errorBoundaryProps } = options || {};

    // If resetKey is provided, use it to reset the boundary when it changes
    if (resetKey !== undefined) {
      return (
        <ErrorBoundary key={resetKey} {...errorBoundaryProps}>
          <Component {...props} />
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}

/**
 * Hook to programmatically reset error boundaries
 *
 * @returns Object containing resetKeys for different boundaries
 */
export function useResetKeys() {
  const [resetKeys, setResetKeys] = React.useState<Record<string, number>>({});

  return {
    resetKeys,
    reset: (key: string) => {
      setResetKeys((prev) => ({
        ...prev,
        [key]: Date.now(),
      }));
    },
  };
}

export default withErrorBoundary;
