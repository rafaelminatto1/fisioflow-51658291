import { Component, ReactNode } from 'react';
import { Provider } from '@/components/error-handling/ErrorBoundaryContext';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: boolean;
  error?: Error;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar erros em componentes React
 * Fornece contexto para reset manual e informações detalhadas do erro
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro para debugging
    logger.error('ErrorBoundary capturou um erro', { error, errorInfo }, 'ErrorBoundary');

    // Chamar callback personalizado se fornecido
    this.props.onError?.(error, errorInfo);

    // Salvar estado para análise
    this.setState({
      error,
      errorInfo,
    });

    // Enviar para serviço de monitoramento (ex: Sentry)
    if (typeof window !== 'undefined' && (window as Record<string, unknown>).Sentry) {
      (window as Record<string, unknown>).Sentry?.captureException?.(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange, children } = this.props;
    const { hasError } = this.state;

    // Reset se resetKeys mudaram
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }

    // Reset se props mudaram e resetOnPropsChange é true
    if (hasError && resetOnPropsChange && prevProps.children !== children) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Provider value={{ reset: this.reset, error: this.state.error }}>
          <ErrorFallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            reset={this.reset}
          />
        </Provider>
      );
    }

    return <Provider value={{ reset: this.reset, error: null }}>{this.props.children}</Provider>;
  }
}

interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reset: () => void;
}

/**
 * Componente de fallback padrão para erros
 */
function ErrorFallback({ error, errorInfo, reset }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Ilustração de erro */}
        <div className="flex justify-center">
          <svg
            className="h-24 w-24 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Mensagens */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Algo deu errado
          </h1>
          <p className="text-muted-foreground">
            {error?.message || 'Ocorreu um erro inesperado na aplicação.'}
          </p>
        </div>

        {/* Detalhes do erro em desenvolvimento */}
        {import.meta.env.DEV && errorInfo && (
          <details className="text-left bg-muted p-4 rounded-lg">
            <summary className="cursor-pointer font-medium text-sm mb-2">
              Detalhes técnicos (desenvolvimento)
            </summary>
            <div className="mt-2 space-y-2">
              {error && (
                <div className="text-xs font-mono bg-background p-2 rounded">
                  <strong>Erro:</strong> {error.name}: {error.message}
                  {error.stack && (
                    <pre className="mt-2 whitespace-pre-wrap text-destructive">
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}
              {errorInfo?.componentStack && (
                <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Ir para página inicial
          </button>
        </div>

        {/* Link de suporte */}
        <p className="text-xs text-muted-foreground">
          Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
