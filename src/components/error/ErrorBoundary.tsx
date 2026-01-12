import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError } from '../../lib/analytics';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
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
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      showDetails: false
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
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
          <Card className="w-full max-w-lg border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-gray-900/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-6 h-20 w-20 bg-red-50 rounded-2xl flex items-center justify-center shadow-inner">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Ops! Algo deu errado
              </CardTitle>
              <CardDescription className="text-gray-600 text-base mt-2 max-w-sm mx-auto">
                Não se preocupe, seus dados estão seguros. Ocorreu um erro inesperado ao processar sua solicitação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col gap-3">
                <Button
                  onClick={this.handleReload}
                  className="h-12 bg-primary hover:bg-primary/90 text-white shadow-md transition-all hover:scale-[1.02] text-lg font-medium"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Recarregar Página
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={this.handleGoBack}
                    variant="outline"
                    className="h-11 hover:bg-gray-50 transition-colors border-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="h-11 hover:bg-gray-50 transition-colors border-gray-200"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Início
                  </Button>
                </div>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full justify-center mb-2"
                  >
                    {this.state.showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Detalhes do erro (Modo Desenvolvedor)
                  </button>

                  {this.state.showDetails && (
                    <div className="bg-slate-950 text-slate-50 rounded-lg p-4 font-mono text-xs overflow-auto max-h-64 border border-slate-800 text-left">
                      <p className="font-bold text-red-400 mb-2 truncate">{this.state.error.name}: {this.state.error.message}</p>
                      {this.state.errorInfo && (
                        <pre className="text-slate-500 whitespace-pre-wrap opacity-80">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center">
                Sessão: {new Date().toLocaleTimeString()}
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