import React, { ComponentType, ReactNode, Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { AsyncBoundary, LoadingBoundary } from '@/components/common/LoadingBoundary';

/**
 * HOC para envolver componentes lazy-loaded com boundary padrão
 */
export function withLoadingBoundary<P extends object>(
  Component: ComponentType<P>,
  options: { type?: 'card' | 'list' | 'stats' | 'table'; rows?: number } = {}
) {
  const { type = 'card', rows = 3 } = options;

  return function WrappedComponent(props: P) {
    return (
      <LoadingBoundary type={type} rows={rows}>
        <Component {...props} />
      </LoadingBoundary>
    );
  };
}

/**
 * Wrapper para lazy loading de componentes pesados com fallback customizado
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: {
    fallback?: ReactNode;
    type?: 'card' | 'list' | 'stats' | 'table';
    rows?: number;
  } = {}
) {
  const LazyComponent = React.lazy(importFn);
  const { fallback, type = 'card', rows = 3 } = options;

  return function LazyWrapper(props: P) {
    return (
      <Suspense
        fallback={
          fallback || <LoadingSkeleton type={type} rows={rows} />
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Wrapper para criar componentes lazy com ErrorBoundary
 */
export function createSafeLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: {
    loadingFallback?: ReactNode;
    errorFallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  } = {}
) {
  const LazyComponent = React.lazy(importFn);
  const { loadingFallback, errorFallback, onError } = options;

  return function SafeLazyWrapper(props: P) {
    return (
      <AsyncBoundary
        loadingFallback={loadingFallback || <LoadingSkeleton type="card" rows={3} />}
        errorFallback={errorFallback}
        onError={onError}
      >
        <LazyComponent {...props} />
      </AsyncBoundary>
    );
  };
}
