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

import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fisioLogger as logger } from "@/lib/errors/logger";

export interface ComponentErrorBoundaryProps {
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
      `Component error${componentName ? ` in ${componentName}` : ""}`,
      {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      componentName || "ComponentErrorBoundary",
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
      if (typeof fallback === "function") {
        return fallback(error!, {
          componentStack: "",
        } as React.ErrorInfo);
      }
      return fallback;
    }

    // Fallback padrão
    return (
      <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-destructive/20 via-destructive/5 to-transparent border border-destructive/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="relative overflow-hidden bg-background/60 backdrop-blur-2xl rounded-[2.25rem] p-8 md:p-10 border border-white/10">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
              <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-destructive/20 to-destructive/40 flex items-center justify-center border border-destructive/30 shadow-inner">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>

            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              Ops! Algo deu errado no componente
              {componentName && (
                <span className="block text-destructive mt-1 text-xl opacity-90 uppercase tracking-widest font-bold">
                  {componentName}
                </span>
              )}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed font-medium">
              Identificamos uma pequena instabilidade ao carregar este recurso. Nossa equipe técnica
              já foi notificada para resolver isso.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Button
                onClick={this.handleReset}
                className="h-14 px-8 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold shadow-lg shadow-destructive/20 gap-3 transition-all active:scale-95 w-full sm:w-auto"
              >
                <RefreshCw className="h-5 w-5" />
                Tentar Novamente
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="h-14 px-8 rounded-2xl border-destructive/20 hover:bg-destructive/5 font-bold gap-3 transition-all active:scale-95 w-full sm:w-auto"
              >
                Recarregar Página
              </Button>
            </div>

            {error && (
              <div className="mt-10 w-full max-w-2xl text-left">
                <details className="group border border-destructive/10 rounded-2xl bg-destructive/5 overflow-hidden transition-all duration-300">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-destructive/10 transition-colors list-none">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-destructive/70">
                        Detalhes Técnicos para Suporte
                      </span>
                    </div>
                    <span className="text-xs font-black text-destructive/40 group-open:rotate-180 transition-transform">
                      ↓
                    </span>
                  </summary>
                  <div className="p-4 pt-0">
                    <div className="bg-slate-950/90 rounded-xl p-4 overflow-x-auto shadow-inner border border-white/5">
                      <code className="text-xs text-rose-400 font-mono block whitespace-pre-wrap break-all leading-relaxed">
                        {error.name}: {error.message}
                        {"\n\n"}
                        {error.stack?.split("\n").slice(0, 3).join("\n")}
                      </code>
                    </div>
                    <p className="text-[10px] mt-4 text-destructive/40 font-bold uppercase text-center tracking-widest">
                      Protocolo: {Math.random().toString(36).substring(7).toUpperCase()}
                    </p>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
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

/**
 * Fallback padrão para componentes pesados
 */
export function HeavyComponentFallback({
  message = "Carregando componente...",
}: {
  message?: string;
}) {
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
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Tentar Novamente
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
          <p className="text-xs text-blue-700">Isso pode levar alguns segundos na primeira vez.</p>
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
