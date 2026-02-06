import React from 'react';
import { RouteErrorBoundary } from '@/components/error-boundaries/RouteErrorBoundary';

export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: { routeName?: string; fallback?: React.ReactNode }
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <RouteErrorBoundary {...options}>
      <Component {...props} />
    </RouteErrorBoundary>
  );

  WrappedComponent.displayName = `withRouteErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
