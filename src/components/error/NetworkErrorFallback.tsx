import React from "react";
import { AlertCircle, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface NetworkErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  message?: string;
}

export const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  message = "Parece que houve um problema de conexão com o servidor do FisioFlow.",
}) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border-destructive/20 shadow-lg shadow-destructive/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Erro de Conexão</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">{message}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="bg-muted/50 p-4 rounded-lg border text-xs font-mono overflow-auto max-h-[120px] text-muted-foreground">
            <div className="flex items-center gap-2 mb-1 text-destructive font-semibold">
              <AlertCircle className="w-3 h-3" />
              <span>LOG DE ERRO:</span>
            </div>
            {error?.message || "Erro desconhecido na camada de rede (Edge Proxy)"}
          </div>
          <p className="text-xs text-center text-slate-500 italic">
            Dica: Verifique sua internet ou tente novamente em alguns instantes.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => resetErrorBoundary?.() || window.location.reload()}
            className="w-full gap-2 font-semibold shadow-sm"
            variant="default"
          >
            <RefreshCcw className="w-4 h-4" />
            Tentar Novamente
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/dashboard")}
            className="w-full text-muted-foreground hover:text-primary transition-colors"
          >
            Voltar ao Painel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
