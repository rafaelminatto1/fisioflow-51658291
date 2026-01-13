/**
 * ComponentErrorBoundary - Error Boundary para componentes individuais
 *
 * Usa React Error Boundary para capturar erros em componentes específicos
 * e exibir UI de fallback apropriada sem quebrar toda a aplicação
 *
 * @example
 * <ComponentErrorBoundary
 *   fallback={<ErrorFallback />}
 *   onError={(error) => logger.error('Component error', error)}
 * >
 *   <MyComponent />
 * </ComponentErrorBoundary>
 */

import { Component, ReactNode, ComponentType } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/errors/logger';

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  /** Componente de fallback em caso de erro */
  fallback?: ReactNode | ((error: Error, errorInfo: React.ErrorInfo) => ReactNode);
  /** Callback chamado quando ocorre um erro */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Nome do componente para logging */
  componentName?: string;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary otimizado para componentes individuais
 * Implementa reset de estado e logging estruturado
 */
export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, componentName } = this.props;

    // Log estruturado do erro
    logger.error(
      `Component error${componentName ? ` in ${componentName}` : ''}`,
      {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      componentName || 'ComponentErrorBoundary'
    );

    // Callback customizado se fornecido
    if (onError) {
      onError(error, errorInfo);
    }
  }

  /**
   * Reset do estado para tentar recuperar
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { children, fallback, componentName } = this.props;
    const { hasError, error } = this.state;

    if (!hasError) {
      return children;
    }

    // Fallback customizado
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error!, {
          componentStack: '' as any,
        } as React.ErrorInfo);
      }
      return fallback;
    }

    // Fallback padrão
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erro no Componente{componentName ? ` ${componentName}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Ocorreu um erro ao renderizar este componente. Tente recarregar.
          </p>
          {error && (
            <details className="mb-4">
              <summary className="text-xs cursor-pointer text-muted-foreground">
                Detalhes do erro
              </summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {error.message}
              </pre>
            </details>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }
}

/**
 * HOC para envolver um componente com Error Boundary
 *
 * @example
 * const SafeMyComponent = withErrorBoundary(MyComponent, {
 *   componentName: 'MyComponent'
 * });
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Omit<ComponentErrorBoundaryProps, 'children'>
): ComponentType<P> {
  const WrappedComponent: ComponentType<P> = (props) => (
    <ComponentErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ComponentErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Fallback padrão para componentes pesados
 */
export function HeavyComponentFallback({ message = "Carregando componente..." }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Fallback para componentes de PDF
 */
export function PDFComponentFallback() {
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-orange-600 mx-auto" />
          <p className="text-sm text-orange-900">
            Não foi possível carregar o visualizador de PDF.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="#" onClick={() => window.location.reload()}>
              Tentar Novamente
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Fallback para componentes de visão computacional
 */
export function ComputerVisionFallback() {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-blue-600 mx-auto" />
          <p className="text-sm text-blue-900">
            O componente de visão computacional está carregando...
          </p>
          <p className="text-xs text-blue-700">
            Isso pode levar alguns segundos na primeira vez.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Fallback para componentes de gráficos
 */
export function ChartFallback() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
        </div>
      </CardContent>
    </Card>
  );
}
