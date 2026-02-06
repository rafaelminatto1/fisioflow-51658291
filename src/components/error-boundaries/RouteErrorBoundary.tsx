 
/**
 * Route Error Boundary Component
 *
 * @description
 * Specialized Error Boundary for route-level error handling.
 * Provides additional context about the route where the error occurred.
 *
 * @module components/error-boundaries/RouteErrorBoundary
 *
 * @example
 * ```tsx
 * <Routes>
 *   <Route element={<RouteErrorBoundary><ProtectedRoute><Schedule /></ProtectedRoute></RouteErrorBoundary>} path="/" />
 * </Routes>
 * ```
 */

import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary, { ErrorBoundaryProps } from './ErrorBoundary';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface RouteErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'onError'> {
  /** Optional route name for better error reporting */
  routeName?: string;
}

/**
 * Route Error Boundary Component
 */
export function RouteErrorBoundary({
  children,
  fallback,
  routeName,
  resetErrorBoundary,
}: RouteErrorBoundaryProps): ReactNode {
  const location = useLocation();

  // Enhanced error handler for routes
  const handleError: ErrorBoundaryProps['onError'] = (error, errorInfo) => {
    const routeInfo = {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      routeName: routeName || location.pathname,
    };

    logger.error(
      `Route Error: ${routeInfo.routeName}`,
      error,
      'RouteErrorBoundary',
      {
        ...errorInfo,
        ...routeInfo,
      }
    );
  };

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={handleError}
      resetErrorBoundary={resetErrorBoundary}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * HOC for wrapping components with route error boundary
 *
 * @example
 * ```tsx
 * const MyPage = withRouteErrorBoundary(function MyPage() {
 *   return <div>My Page</div>;
 * }, { routeName: 'MyPage' });
 * ```
 */
export default RouteErrorBoundary;
