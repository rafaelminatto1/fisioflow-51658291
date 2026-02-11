/**
 * Error Boundary com Sentry
 *
 * Captura erros do React e envia para o Sentry
 */

import React from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryWithSentryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
  showDialog?: boolean;
}

interface FallbackProps {
  error: Error;
  resetError: () => void;
  errorId: string;
}

/**
 * Fallback UI padrão
 */
function DefaultFallback({ error, resetError, errorId }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle>Ops! Algo deu errado</CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado. Nossa equipe foi notificada.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {import.meta.env.DEV && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-mono text-xs break-all">{error.message}</p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs font-semibold cursor-pointer">
                    Stack trace
                  </summary>
                  <pre className="text-xs font-mono mt-2 overflow-auto max-h-48">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir para home
            </Button>
          </div>

          {errorId && (
            <p className="text-xs text-muted-foreground text-center">
              Código do erro: <code className="font-mono">{errorId}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error Boundary com integração Sentry
 */
export function ErrorBoundaryWithSentry({
  children,
  fallback: FallbackComponent = DefaultFallback,
  showDialog = import.meta.env.DEV,
}: ErrorBoundaryWithSentryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError, errorId }) => (
        <FallbackComponent
          error={error}
          resetError={resetError}
          errorId={errorId}
        />
      )}
      showDialog={showDialog}
      onError={(error, errorInfo) => {
        console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

/**
 * Hook para resetar o Error Boundary programaticamente
 */
export function useErrorBoundaryReset() {
  const reset = () => {
    window.location.reload();
  };

  return { reset };
}

/**
 * Higher-Order Component para adicionar Error Boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<FallbackProps>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundaryWithSentry fallback={fallback}>
        <Component {...props} />
      </ErrorBoundaryWithSentry>
    );
  };
}

/**
 * HOC para capturar erros de componentes assíncronos
 * (usado com React.Suspense para error boundaries assíncronos)
 */
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<FallbackProps>
) {
  return function WrappedAsyncComponent(props: P) {
    return (
      <Sentry.ErrorBoundary
        fallback={fallback}
        onError={(error) => {
          console.error('[AsyncErrorBoundary] Erro assíncrono:', error);
        }}
      >
        <React.Suspense fallback={<AsyncComponentFallback />}>
          <Component {...props} />
        </React.Suspense>
      </Sentry.ErrorBoundary>
    );
  };
}

/**
 * Fallback para componentes assíncronos
 */
function AsyncComponentFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

/**
 * Componente para mostrar erros específicos
 */
export function ShowError({
  error,
  onRetry,
  onDismiss,
}: {
  error: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const errorId = Sentry.captureException(error);

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Erro</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              ✕
            </Button>
          )}
        </div>
        <CardDescription>{error.message}</CardDescription>
      </CardHeader>

      {onRetry && (
        <CardContent>
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      )}

      {import.meta.env.DEV && error.stack && (
        <CardContent>
          <details>
            <summary className="text-xs font-semibold cursor-pointer mb-2">
              Stack trace
            </summary>
            <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-48">
              {error.stack}
            </pre>
          </details>
        </CardContent>
      )}
    </Card>
  );
}
