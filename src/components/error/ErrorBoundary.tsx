import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError } from '../../lib/analytics';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, ChevronDown, ChevronRight, Copy, Terminal } from 'lucide-react';
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
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      showDetails: false,
      copied: false
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
    });

    // Check for chunk load error
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed')
    ) {
      // Check if we already tried reloading
      const storageKey = 'chunk_load_error_reload';
      const lastReload = sessionStorage.getItem(storageKey);

      if (!lastReload) {
        sessionStorage.setItem(storageKey, 'true');
        window.location.reload();
        return;
      }
    }
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

  copyErrorDetails = () => {
    const details = this.getFormattedErrorDetails();
    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  getFormattedErrorDetails = () => {
    const { error, errorInfo } = this.state;
    const timestamp = new Date().toISOString();
    const url = window.location.href;
    const userAgent = navigator.userAgent;

    return `
═══════════════════════════════════════════════════════════════
ERRO - FisioFlow
═══════════════════════════════════════════════════════════════
📅 Timestamp: ${timestamp}
🔗 URL: ${url}
💻 User Agent: ${userAgent}
───────────────────────────────────────────────────────────────
❌ Error: ${error?.name || 'Unknown'}
📝 Message: ${error?.message || 'No message'}
📍 Stack Trace:
${error?.stack || 'No stack trace'}
───────────────────────────────────────────────────────────────
🏗️ Component Stack:
${errorInfo?.componentStack || 'No component stack'}
═══════════════════════════════════════════════════════════════
    `.trim();
  };

  getMinifiedErrorInfo = () => {
    const { error } = this.state;
    const url = window.location.href;

    // Extrai apenas as partes importantes do stack trace
    const stackLines = error?.stack?.split('\n') || [];
    const relevantStack = stackLines
      .filter(line => line.includes('src/') || line.includes('webpack'))
      .slice(0, 3)
      .map(line => {
        const match = line.match(/(src\/|webpack:\/\/[^/]+\/)([^\s]+)/);
        return match ? match[1] : line.trim();
      });

    return {
      message: error?.message || 'Erro desconhecido',
      url: url.split('/').pop() || url,
      stack: relevantStack,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };
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

              {this.state.error && (
                <div className="pt-4 border-t border-gray-100">
                  {/* Versão minimizada - sempre visível para devs */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-800">INFO DEV</span>
                    </div>
                    <div className="space-y-1 text-[10px] font-mono text-amber-900">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600">msg:</span>
                        <span className="truncate">{this.getMinifiedErrorInfo().message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600">url:</span>
                        <span className="text-amber-700">{this.getMinifiedErrorInfo().url}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600">time:</span>
                        <span>{this.getMinifiedErrorInfo().timestamp}</span>
                      </div>
                      {this.getMinifiedErrorInfo().stack.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-amber-200">
                          <span className="text-amber-600">stack:</span>
                          {this.getMinifiedErrorInfo().stack.map((line, i) => (
                            <div key={i} className="pl-2 text-amber-800 truncate">└─ {line}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full justify-center mb-2"
                  >
                    {this.state.showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {this.state.showDetails ? 'Ocultar' : 'Ver'} detalhes completos
                  </button>

                  {this.state.showDetails && (
                    <div className="bg-slate-950 text-slate-50 rounded-lg p-4 font-mono text-xs overflow-auto max-h-64 border border-slate-800 text-left relative">
                      <button
                        onClick={this.copyErrorDetails}
                        className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        {this.state.copied ? 'Copiado!' : 'Copiar'}
                      </button>
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