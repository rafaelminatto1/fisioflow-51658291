import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorLogger } from '@/lib/errors/logger';

export interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro
    const errorId = errorLogger.logError(error.message, {
      context: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    this.setState({
      errorInfo,
      errorId: Date.now().toString()
    });

    // Callback personalizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback personalizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI padrão de erro
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Oops! Algo deu errado
              </CardTitle>
              <CardDescription className="text-lg">
                Encontramos um erro inesperado. Nossa equipe foi notificada.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {this.state.errorId && (
                <Alert>
                  <AlertDescription>
                    <strong>ID do Erro:</strong> {this.state.errorId}
                    <br />
                    <span className="text-sm text-gray-600">
                      Use este ID ao entrar em contato com o suporte.
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {this.props.showDetails && this.state.error && (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Detalhes técnicos:</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                  {process.env.NODE_ENV === 'development' && this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap break-words">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Ir para Início
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar Página
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600">
                <p>
                  Se o problema persistir, entre em contato com nosso{' '}
                  <a 
                    href="mailto:suporte@fisioflow.com" 
                    className="text-blue-600 hover:underline"
                  >
                    suporte técnico
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export { ErrorBoundary };

// Componente funcional para casos específicos
export const ErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
  errorId?: string;
}> = ({ error, resetError, errorId }) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-lg">Erro Encontrado</CardTitle>
          <CardDescription>
            {error.message || 'Algo deu errado'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {errorId && (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>ID:</strong> {errorId}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={resetError} 
            className="w-full flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};