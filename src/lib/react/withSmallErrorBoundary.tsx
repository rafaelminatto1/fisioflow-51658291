import { Component, ComponentType, ReactNode } from 'react';
import { SmallErrorFallback } from '@/components/error-handling/SmallErrorBoundary';

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * HOC para envolver componentes pequenos com Error Boundary
 */
export function withErrorBoundary<P extends object>(
  Wrapped: ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error) => void
) {
  return class WrappedComponent extends Component<P, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
      onError?.(error);
    }

    render() {
      if (this.state.hasError) {
        return fallback || <SmallErrorFallback error={this.state.error} />;
      }

      return <Wrapped {...this.props} />;
    }
  };
}
