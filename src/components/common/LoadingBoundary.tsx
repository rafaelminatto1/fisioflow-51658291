import React, { Suspense, ComponentType, ReactNode } from 'react';
import { LoadingSkeleton } from '@/components/web/ui/loading-skeleton';

interface LoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  type?: 'card' | 'list' | 'stats' | 'table';
  rows?: number;
}

/**
 * Boundary de suspensão para componentes lazy-loaded
 * Fornece loading states granulares e tratativas de erro
 */
export function LoadingBoundary({
  children,
  fallback,
  type = 'card',
  rows = 3,
}: LoadingBoundaryProps) {
  const defaultFallback = fallback || <LoadingSkeleton type={type} rows={rows} />;

  return <Suspense fallback={defaultFallback}>{children}</Suspense>;
}

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
        <Component {...(props as any)} />
      </LoadingBoundary>
    );
  };
}

/**
 * Componente para carregar módulos pesados apenas quando necessário
 */
export function SuspenseModule({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode | null;
}) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Carregando módulo...</p>
            </div>
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Wrapper para lazy loading de componentes pesados com fallback customizado
 */
export function createLazyComponent<
  P extends object,
>(importFn: () => Promise<{ default: ComponentType<P> }>, options: {
  fallback?: ReactNode;
  type?: 'card' | 'list' | 'stats' | 'table';
  rows?: number;
} = {}) {
  const LazyComponent = React.lazy(importFn);
  const { fallback, type = 'card', rows = 3 } = options;

  return function LazyWrapper(props: P) {
    return (
      <Suspense
        fallback={
          fallback || <LoadingSkeleton type={type} rows={rows} />
        }
      >
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

/**
 * Boundary para componentes com tratamento de erro
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold text-destructive">Erro ao carregar componente</p>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'Erro desconhecido'}
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Boundary combinada de Suspense e Error para lazy loading robusto
 */
export function AsyncBoundary({
  children,
  loadingFallback,
  errorFallback,
  onError,
}: {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary fallback={errorFallback} onError={onError}>
      <Suspense fallback={loadingFallback || <LoadingSkeleton type="card" rows={3} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
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
      <ErrorBoundary fallback={errorFallback} onError={onError}>
        <Suspense
          fallback={
            loadingFallback || <LoadingSkeleton type="card" rows={3} />
          }
        >
          <LazyComponent {...(props as any)} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}
