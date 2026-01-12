import { Component, ReactNode } from 'react';
import { Query } from '@tanstack/react-query';
import { useErrorBoundary } from './ErrorBoundaryContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Error Boundary específico para erros do React Query
 * Captura erros de consulta e exibe mensagem apropriada
 */
export class QueryErrorBoundary extends Component<Props> {
  render() {
    const { fallback, children } = this.props;

    return (
      <Query>
        {({ query }) => {
          if (query.state.status === 'error') {
            const error = query.state.error as Error;

            if (fallback) {
              return <>{fallback}</>;
            }

            return (
              <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Erro ao carregar dados
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {error.message || 'Ocorreu um erro ao carregar as informações.'}
                </p>
                <button
                  onClick={() => query.reset()}
                  className="text-sm text-primary hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            );
          }

          return <>{children}</>;
        }}
      </Query>
    );
  }
}

/**
 * Componente para exibir estado de erro de uma query específica
 */
export function QueryErrorFallback({
  error,
  reset,
  title = 'Erro ao carregar dados',
  showDetails = true,
}: {
  error: Error | null;
  reset: () => void;
  title?: string;
  showDetails?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <div className="p-4 bg-destructive/10 rounded-full">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {showDetails && error?.message && (
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Tentar novamente
      </button>
    </div>
  );
}
