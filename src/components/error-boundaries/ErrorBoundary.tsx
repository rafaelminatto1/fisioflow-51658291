/**
 * Error Boundary Component
 *
 * @description
 * React Error Boundary that catches JavaScript errors anywhere in the component
 * tree, logs those errors, and displays a fallback UI.
 *
 * @module components/error-boundaries/ErrorBoundary
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={CustomFallback} onError={logger.error}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { ErrorFallback } from './ErrorFallback';

export interface ErrorBoundaryProps {
  /** Child components to be wrapped by the error boundary */
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom reset function */
  resetErrorBoundary?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Class Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to service
    logger.error('Error Boundary caught an error', error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.resetErrorBoundary?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props;
      const { error } = this.state;

      // Use custom fallback
      if (React.isValidElement(fallback)) {
        return fallback;
      }

      // Use fallback function
      if (typeof fallback === 'function' && error) {
        return fallback(error, this.handleReset);
      }

      // Use default fallback
      return <ErrorFallback error={error as Error} resetError={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Default export
 */
export default ErrorBoundary;
