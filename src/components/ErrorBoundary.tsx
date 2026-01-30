/**
 * FisioFlow - Error Boundary
 *
 * Componente que captura erros JavaScript em qualquer componente filho
 * e exibe uma UI de fallback apropriada
 */

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

/**
 * Error Boundary Component
 *
 * Uso:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log do erro
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);

    // Salvar estado do erro
    this.setState({
      error,
      errorInfo,
    });

    // Chamar callback customizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Enviar para serviço de logging (ex: Sentry)
    const sentry = typeof window !== 'undefined' ? (window as Window & { Sentry?: { captureException: (error: Error, context: object) => void } }).Sentry : undefined;
    if (sentry) {
      sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Usar fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback padrão
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icone de erro */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Mensagem de erro */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-text-primary">
                Algo deu errado
              </h1>
              <p className="text-text-secondary">
                Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver.
              </p>
            </div>

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary">
                  Ver detalhes do erro
                </summary>
                <div className="mt-4 p-4 bg-background rounded-lg border border-border">
                  <p className="font-mono text-sm text-destructive mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-text-tertiary overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={this.handleReset}
              >
                Tentar novamente
              </Button>
              <Button
                onClick={this.handleReload}
              >
                Recarregar página
              </Button>
            </div>

            {/* Link de suporte */}
            <p className="text-sm text-text-tertiary">
              Se o problema persistir,{' '}
              <a
                href="mailto:suporte@fisioflow.com"
                className="text-primary hover:underline"
              >
                entre em contato
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Fallback simples de erro para usar em componentes menores
 */
export function SimpleErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="font-medium text-destructive">Erro ao carregar</h3>
          {error.message && (
            <p className="text-sm text-text-secondary mt-1">{error.message}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
        >
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

export default ErrorBoundary;
