/**
 * Fallback para erros de rede/conexão
 *
 * Exibido quando há falha ao carregar dados ou problemas de conectividade
 */

import { RefreshCw, WifiOff, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NetworkErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  isOffline?: boolean;
}

export function NetworkErrorFallback({
  error,
  onRetry,
  onGoHome,
  onGoBack,
  isOffline
}: NetworkErrorFallbackProps) {
  const isNetworkError = error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.message?.includes('Failed to fetch') ||
    isOffline;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 bg-orange-50 rounded-full flex items-center justify-center">
            {isNetworkError || isOffline ? (
              <WifiOff className="h-8 w-8 text-orange-500" />
            ) : (
              <WifiOff className="h-8 w-8 text-red-500" />
            )}
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            {isOffline ? 'Sem Conexão' : 'Erro de Conexão'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isOffline
              ? 'Você está offline. Verifique sua conexão com a internet.'
              : 'Não foi possível conectar ao servidor. Tente novamente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informação adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">💡 Dica:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Verifique se o WiFi está ligado</li>
              <li>Tente recarregar a página</li>
              <li>Se o problema persistir, contate o suporte</li>
            </ul>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white shadow-md transition-all hover:scale-[1.02]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {onGoBack && (
                <Button
                  onClick={onGoBack}
                  variant="outline"
                  className="h-11"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}

              {onGoHome && (
                <Button
                  onClick={onGoHome}
                  variant="outline"
                  className="h-11"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Início
                </Button>
              )}
            </div>
          </div>

          {/* Informações de debug (se houver erro específico) */}
          {error && !isNetworkError && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">
                Detalhes do erro
              </summary>
              <div className="mt-2 p-2 bg-gray-50 rounded font-mono text-gray-600 break-all">
                {error.message}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Fallback para erros de carregamento de módulos (chunk loading error)
 */
export function ChunkLoadErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 bg-yellow-50 rounded-full flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Atualização Disponível
          </CardTitle>
          <CardDescription className="text-gray-600">
            O aplicativo foi atualizado. Recarregue a página para obter a nova versão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Recarregar Agora
          </Button>
          <p className="text-xs text-center text-gray-500">
            Suas alterações não salvasas podem ser perdidas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Fallback genérico para erros de API
 */
export function APIErrorFallback({
  error,
  onRetry,
  onGoHome
}: {
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-red-500" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Erro ao Carregar Dados
          </CardTitle>
          <CardDescription className="text-gray-600">
            {error?.message || 'Não foi possível carregar os dados. Tente novamente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
          {onGoHome && (
            <Button
              onClick={onGoHome}
              variant="outline"
              className="w-full h-11"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir para o Início
            </Button>
          )}
        </CardContent>
      </Card>
    </div>);
}
