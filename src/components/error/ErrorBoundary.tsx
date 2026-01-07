import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError } from '../../lib/analytics';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Rastrear erro no sistema de analytics
    trackError(error, errorInfo);

    // Callback personalizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // Error is already tracked by trackError function
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-lg border-red-100 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-6 h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Ops! Algo não saiu como esperado
              </CardTitle>
              <CardDescription className="text-gray-600 text-base mt-2">
                Não se preocupe, seus dados estão seguros. Tente recarregar a página para voltar ao normal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-slate-950 text-slate-50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-48 border border-slate-800">
                  <div className="flex items-center gap-2 text-red-400 mb-2 border-b border-slate-800 pb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-bold">Debug Info</span>
                  </div>
                  <p className="whitespace-pre-wrap break-all">{this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <p className="text-slate-500 mt-2 text-xs">{this.state.errorInfo.componentStack.slice(0, 300)}...</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="h-11 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="h-11 bg-primary hover:bg-primary/90 text-white shadow-md transition-all hover:scale-[1.02]"
                >
                  Recarregar Sistema
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Código do Erro: {this.state.error?.name || 'Unknown'} • Sessão: {new Date().toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;