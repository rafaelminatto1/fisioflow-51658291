import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Bug, Copy, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { logger } from '@/lib/errors/logger';

declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

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

interface BrowserInfo {
  browser: string;
  os: string;
  ua: string;
}

interface ErrorReport {
  timestamp: string;
  appointmentId?: string;
  patientId?: string;
  environment: {
    browser: string;
    os: string;
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    language: string;
    cookieEnabled: boolean;
    onlineStatus: boolean;
    memory?: string;
  };
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  componentStack?: string;
}

interface MinifiedErrorInfo {
  message: string;
  url: string;
  appointmentId: string;
  patientId: string;
  stack: string[];
  timestamp: string;
  browser: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  language: string;
  cookieEnabled: boolean;
  onlineStatus: 'online' | 'offline';
  memory: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_STORAGE_KEY = 'lastPatientEvolutionError';
const COPY_FEEDBACK_DURATION = 2000;
const MAX_STACK_LINES = 3;

const BROWSER_PATTERNS: Record<string, RegExp> = {
  Chrome: /Chrome/,
  Firefox: /Firefox/,
  Safari: /Safari/,
  Edge: /Edg/,
};

const OS_PATTERNS: Record<string, RegExp> = {
  Windows: /Windows/,
  macOS: /Mac/,
  Linux: /Linux/,
  Android: /Android/,
  iOS: /iPhone|iPad|iPod/,
};

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

/**
 * ErrorBoundary especializado para capturar erros na página de Evolução do Paciente
 * e mostrar informações detalhadas para debug
 *
 * @component
 * @example
 * ```tsx
 * <PatientEvolutionErrorBoundary appointmentId="123" patientId="456">
 *   <PatientEvolutionPage />
 * </PatientEvolutionErrorBoundary>
 * ```
 */
export class PatientEvolutionErrorBoundary extends Component<Props, State> {
  private resetTimer?: ReturnType<typeof setTimeout>;

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log do erro para debugging
    logger.error('[PatientEvolutionErrorBoundary]', { error, errorInfo }, 'PatientEvolutionErrorBoundary');

    // Salvar no sessionStorage para análise posterior
    this.saveErrorReport(error, errorInfo);
  }

  componentWillUnmount(): void {
    // Limpar timer se o componente for desmontado
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private saveErrorReport(error: Error, errorInfo: ErrorInfo): void {
    try {
      const report = this.buildErrorReport(error, errorInfo);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(report, null, 2));
    } catch (storageError) {
      logger.error('[PatientEvolutionErrorBoundary] Falha ao salvar erro', storageError, 'PatientEvolutionErrorBoundary');
    }
  }

  private buildErrorReport(error: Error, errorInfo: ErrorInfo): ErrorReport {
    const browserInfo = this.getBrowserInfo();

    return {
      timestamp: new Date().toISOString(),
      appointmentId: this.props.appointmentId,
      patientId: this.props.patientId,
      environment: {
        browser: browserInfo.browser,
        os: browserInfo.os,
        userAgent: browserInfo.ua,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine,
        memory: this.getMemoryUsage(),
      },
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
    };
  }

  private getMemoryUsage(): string | undefined {
    try {
      const memory = performance.memory;
      return memory?.usedJSHeapSize
        ? `${Math.round(memory.usedJSHeapSize / 1048576)}MB`
        : undefined;
    } catch {
      return undefined;
    }
  }

  private getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;

    const browser = Object.entries(BROWSER_PATTERNS).find(([, pattern]) =>
      pattern.test(ua)
    )?.[0] ?? 'Unknown';

    const os = Object.entries(OS_PATTERNS).find(([, pattern]) =>
      pattern.test(ua)
    )?.[0] ?? 'Unknown';

    return { browser, os, ua };
  }

  private extractRelevantStack(stack?: string): string[] {
    if (!stack) return [];

    const lines = stack.split('\n');
    return lines
      .filter(line => line.includes('src/') || line.includes('webpack'))
      .slice(0, MAX_STACK_LINES)
      .map(line => {
        const match = line.match(/(src\/|webpack:\/\/[^/]+\/)([^\s]+)/);
        return match ? match[1] : line.trim();
      });
  }

  private getMinifiedErrorInfo(): MinifiedErrorInfo {
    const { error } = this.state;
    const { appointmentId, patientId } = this.props;
    const browserInfo = this.getBrowserInfo();

    return {
      message: error?.message ?? 'Erro desconhecido',
      url: window.location.pathname,
      appointmentId: appointmentId ?? 'undefined',
      patientId: patientId ?? 'undefined',
      stack: this.extractRelevantStack(error?.stack),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      browser: browserInfo.browser,
      os: browserInfo.os,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine ? 'online' : 'offline',
      memory: this.getMemoryUsage() ?? 'N/A',
    };
  }

  private getFormattedErrorDetails(): string {
    const { error, errorInfo } = this.state;
    const { appointmentId, patientId } = this.props;
    const browserInfo = this.getBrowserInfo();

    return `
═══════════════════════════════════════════════════════════════
ERRO - PatientEvolution ErrorBoundary
═══════════════════════════════════════════════════════════════
📅 Timestamp: ${new Date().toISOString()}
🔗 URL: ${window.location.href}
👤 appointmentId: ${appointmentId || 'N/A'}
🏥 patientId: ${patientId || 'N/A'}
───────────────────────────────────────────────────────────────
💻 Ambiente:
   • Browser: ${browserInfo.browser} ${browserInfo.os}
   • Screen: ${window.screen.width}x${window.screen.height}
   • Viewport: ${window.innerWidth}x${window.innerHeight}
   • Language: ${navigator.language}
   • Online: ${navigator.onLine ? 'Sim' : 'Não'}
   • Cookies: ${navigator.cookieEnabled ? 'Ativados' : 'Desativados'}
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
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  private copyToClipboard = async (): Promise<void> => {
    const details = this.getFormattedErrorDetails();

    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });

      this.resetTimer = setTimeout(() => {
        this.setState({ copied: false });
      }, COPY_FEEDBACK_DURATION);
    } catch (err) {
      logger.error('[PatientEvolutionErrorBoundary] Falha ao copiar', err, 'PatientEvolutionErrorBoundary');
    }
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoBack = (): void => {
    window.location.href = '/schedule';
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const minified = this.getMinifiedErrorInfo();
    const { error } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-lg w-full shadow-lg">
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-foreground">
                  Erro ao Carregar Evolução
                </h1>
                <p className="text-xs text-muted-foreground">
                  Ocorreu um erro inesperado. Os detalhes técnicos estão abaixo.
                </p>
              </div>
            </div>

            {/* Debug Info Card */}
            <div className="mb-4 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              {/* Header do Debug */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Bug className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                    DEBUG INFO
                  </span>
                </div>
                <span className="text-[9px] text-amber-600 dark:text-amber-500">
                  {minified.timestamp}
                </span>
              </div>

              {/* Mensagem de erro em destaque */}
              <div className="mb-2 p-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-[9px] text-red-600 dark:text-red-400 font-mono break-all">
                    {minified.message}
                  </span>
                </div>
              </div>

              {/* Grid de informações do ambiente */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono text-amber-900 dark:text-amber-300">
                <DebugField label="ID" value={minified.appointmentId?.slice(0, 8) || 'N/A'} />
                <DebugField label="patient" value={minified.patientId?.slice(0, 8) || 'N/A'} />
                <DebugField label="browser" value={minified.browser} />
                <DebugField label="os" value={minified.os} />
                <DebugField
                  label="screen"
                  value={`${minified.screenWidth}×${minified.screenHeight}`}
                />
                <DebugField
                  label="view"
                  value={`${minified.viewportWidth}×${minified.viewportHeight}`}
                />
                <DebugField label="lang" value={minified.language} />
                <DebugField label="mem" value={minified.memory} />
              </div>

              {/* Stack trace resumido (expansível) */}
              {minified.stack.length > 0 && (
                <details className="mt-2 group">
                  <summary className="text-[9px] text-amber-700 dark:text-amber-400 cursor-pointer hover:text-amber-900 dark:hover:text-amber-300 select-none">
                    stack trace ({minified.stack.length}) ▼
                  </summary>
                  <div className="mt-1.5 pl-2 border-l-2 border-amber-300 dark:border-amber-700 space-y-0.5">
                    {minified.stack.map((line, i) => (
                      <div
                        key={i}
                        className="text-[8px] text-amber-800 dark:text-amber-400 font-mono truncate"
                        title={line}
                      >
                        └ {line}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Stack trace completo (expansível) */}
            {error?.stack && (
              <details className="mb-4 group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none mb-2">
                  Stack trace completo
                </summary>
                <div className="bg-slate-950 text-slate-50 rounded-lg p-3 font-mono text-xs overflow-auto max-h-40 relative">
                  <button
                    onClick={this.copyToClipboard}
                    className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                    type="button"
                  >
                    <Copy className="h-3 w-3" />
                    {this.state.copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <p className="font-bold text-red-400 mb-2 pr-16">{error.name}: {error.message}</p>
                  <pre className="text-slate-400 whitespace-pre-wrap text-[10px]">
                    {error.stack}
                  </pre>
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={this.handleReload}
                variant="default"
                size="sm"
                className="flex-1"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Recarregar
              </Button>
              <Button
                onClick={this.handleGoBack}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Agenda
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface DebugFieldProps {
  label: string;
  value: string | number;
}

function DebugField({ label, value }: DebugFieldProps) {
  return (
    <div className="flex gap-1.5">
      <span className="text-amber-600 dark:text-amber-500 min-w-fit">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
