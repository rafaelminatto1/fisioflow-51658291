/**
 * Error Boundaries Module
 *
 * @description
 * Complete error boundary system for React applications.
 * Provides class components, HOCs, and utilities for error handling.
 *
 * @module components/error-boundaries
 *
 * @example
 * ```tsx
 * import { ErrorBoundary, RouteErrorBoundary, withErrorBoundary } from '@/components/error-boundaries';
 *
 * // Wrap entire app
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // Wrap routes
 * <Route element={<RouteErrorBoundary routeName="Dashboard"><Dashboard /></RouteErrorBoundary>} path="/dashboard" />
 *
 * // Wrap individual components
 * const MyComponent = withErrorBoundary(Component, { fallback: <Error /> });
 * ```
 */

// Main error boundary class component
export { ErrorBoundary, type ErrorBoundaryProps, type ErrorBoundaryState } from './ErrorBoundary';
export { default as ErrorBoundary } from './ErrorBoundary';

// Route-specific error boundary
export { RouteErrorBoundary } from './RouteErrorBoundary';
export { withRouteErrorBoundary } from '@/lib/react/routeErrorBoundary';
export { default as RouteErrorBoundary } from './RouteErrorBoundary';

// HOC for wrapping components
export { withErrorBoundary, useResetKeys } from './withErrorBoundary';
export { default as withErrorBoundary } from './withErrorBoundary';

// Fallback UI component
export { ErrorFallback } from './ErrorFallback';
