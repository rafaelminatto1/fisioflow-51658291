import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface PatientErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PatientErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary específico para componentes de paciente
 * Captura erros na renderização da lista de pacientes e exibe UI amigável
 */
export class PatientErrorBoundary extends Component<
  PatientErrorBoundaryProps,
  PatientErrorBoundaryState
> {
  constructor(props: PatientErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PatientErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error para debugging
    logger.error('PatientErrorBoundary capturou um erro', error, 'PatientErrorBoundary', {
      componentStack: errorInfo.componentStack,
    });

    // Callback customizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });
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
      // Fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI padrão de erro
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Erro ao carregar pacientes</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Ocorreu um erro inesperado ao exibir a lista de pacientes. Nossa equipe foi notificada
              e está trabalhando na correção.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-4 p-4 bg-muted rounded-lg max-w-lg mx-auto">
                <summary className="cursor-pointer font-semibold mb-2">Detalhes técnicos</summary>
                <pre className="text-xs overflow-auto mt-2 text-destructive">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
              <Button onClick={this.handleReload} variant="default">
                Recarregar página
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Componente simplificado para usar com children function pattern
 */
interface PatientErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const PatientErrorFallback: React.FC<PatientErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar pacientes</h3>
        <p className="text-muted-foreground mb-4">
          {error.message || 'Ocorreu um erro inesperado.'}
        </p>
        <Button onClick={resetError} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
};
