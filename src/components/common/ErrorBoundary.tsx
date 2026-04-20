import React, { Component, ErrorInfo, ReactNode } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <MainLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Ops! Algo deu errado.
            </h1>
            <p className="text-slate-500 max-w-md mb-8">
              Ocorreu um erro inesperado ao carregar esta página. Não se preocupe, seus dados estão seguros.
            </p>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-8 p-4 bg-slate-50 rounded-xl text-left max-w-2xl overflow-auto border border-slate-200">
                <p className="font-mono text-xs text-red-600 mb-2">{this.state.error.message}</p>
                <pre className="text-[10px] text-slate-400 font-mono">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleReset}
                className="gap-2 bg-slate-900 hover:bg-slate-800 h-12 px-8 rounded-xl font-bold"
              >
                <RefreshCcw className="h-4 w-4" />
                Tentar Novamente
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = "/"}
                className="h-12 px-8 rounded-xl font-bold border-slate-200"
              >
                Voltar para o Início
              </Button>
            </div>
          </div>
        </MainLayout>
      );
    }

    return this.props.children;
  }
}
