import { Component, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Algo deu errado</CardTitle>
          </div>
          <CardDescription>
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-mono text-destructive">{error.message}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} variant="default">
              Tentar novamente
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/';
              }}
              variant="outline"
            >
              Ir para início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SentryErrorBoundaryProps {
  children: ReactNode;
}

export function SentryErrorBoundary({ children }: SentryErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Capturar erro no Sentry
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }}
      onReset={() => {
        // Limpar estado quando resetar
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

