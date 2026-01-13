import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Bug, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface Props {
  children: ReactNode;
  appointmentId?: string;
  patientId?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  copied: boolean;
}

/**
 * ErrorBoundary especializado para capturar erros na página de Evolução do Paciente
 * e mostrar informações detalhadas para debug
 */
export class PatientEvolutionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      copied: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro para debugging
    console.error('PatientEvolution ErrorBoundary capturou um erro:', error, errorInfo);

    // Salvar no sessionStorage para análise posterior
    try {
      const errorReport = {
        timestamp: new Date().toISOString(),
        appointmentId: this.props.appointmentId,
        patientId: this.props.patientId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        componentStack: errorInfo.componentStack
      };
      sessionStorage.setItem('lastPatientEvolutionError', JSON.stringify(errorReport, null, 2));
    } catch (e) {
      console.error('Falha ao salvar erro no sessionStorage:', e);
    }
  }

  copyErrorDetails = () => {
    const details = this.getFormattedErrorDetails();
    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  getFormattedErrorDetails = () => {
    const { error, errorInfo } = this.state;
    const { appointmentId, patientId } = this.props;

    return `
═══════════════════════════════════════════════════════════════
ERRO - PatientEvolution
═══════════════════════════════════════════════════════════════
📅 Timestamp: ${new Date().toISOString()}
🔗 URL: ${window.location.href}
👤 appointmentId: ${appointmentId || 'N/A'}
🏥 patientId: ${patientId || 'N/A'}
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
    const { appointmentId, patientId } = this.props;

    // Extrai apenas as partes importantes do stack trace
    const stackLines = error?.stack?.split('\n') || [];
    const relevantStack = stackLines
      .filter(line => line.includes('src/') || line.includes('webpack'))
      .slice(0, 3)
      .map(line => {
        const match = line.match(/(?:src\/|webpack:\/\/[^\/]+\/)([^\s]+)/);
        return match ? match[1] : line.trim();
      });

    return {
      message: error?.message || 'Erro desconhecido',
      url: window.location.href.split('/').pop() || window.location.href,
      appointmentId: appointmentId || 'undefined',
      patientId: patientId || 'undefined',
      stack: relevantStack,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };
  };

  render() {
    if (this.state.hasError) {
      const minified = this.getMinifiedErrorInfo();

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardContent className="pt-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Erro ao Carregar Evolução</h1>
                  <p className="text-sm text-muted-foreground">
                    Ocorreu um erro inesperado ao carregar a página de evolução do paciente.
                  </p>
                </div>
              </div>

              {/* INFO DEV - sempre visível */}
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800">INFO DEV (Debug):</span>
                </div>
                <div className="text-[10px] font-mono text-amber-900 space-y-1">
                  <div className="flex gap-2">
                    <span className="text-amber-600 w-24">msg:</span>
                    <span className="truncate flex-1">{minified.message}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-600 w-24">url:</span>
                    <span className="text-amber-700">{minified.url}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-600 w-24">appointmentId:</span>
                    <span className="font-mono">{minified.appointmentId}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-600 w-24">patientId:</span>
                    <span className="font-mono">{minified.patientId}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-600 w-24">time:</span>
                    <span>{minified.timestamp}</span>
                  </div>
                  {minified.stack.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-amber-300">
                      <span className="text-amber-600">stack:</span>
                      {minified.stack.map((line, i) => (
                        <div key={i} className="pl-2 text-amber-800 truncate text-[9px]">└─ {line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stack trace completa - expansível */}
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
                  Ver stack trace completo
                </summary>
                <div className="bg-slate-950 text-slate-50 rounded-lg p-3 font-mono text-xs overflow-auto max-h-48 text-left relative">
                  <button
                    onClick={this.copyErrorDetails}
                    className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    {this.state.copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <p className="font-bold text-red-400 mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
                  <pre className="text-slate-500 whitespace-pre-wrap opacity-80 text-[10px]">
                    {this.state.error?.stack}
                  </pre>
                </div>
              </details>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recarregar Página
                </Button>
                <Button
                  onClick={() => window.location.href = '/schedule'}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para Agenda
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
