import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ApiFallbackProps {
  /**
   * Error that caused the fallback
   */
  error?: Error | null;
  
  /**
   * Function to retry the request
   */
  onRetry?: () => void;
  
  /**
   * Whether the error is from a circuit breaker
   */
  isCircuitBreakerError?: boolean;
  
  /**
   * Estimated time until retry will be available (for circuit breaker)
   */
  retryAfterSeconds?: number;
  
  /**
   * Whether to show cached data if available
   */
  showCachedData?: boolean;
  
  /**
   * Cached data to display
   */
  cachedData?: unknown;
}

export function ApiFallback({
  error,
  onRetry,
  isCircuitBreakerError = false,
  retryAfterSeconds,
  showCachedData = false,
  cachedData,
}: ApiFallbackProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfterSeconds || 0);
  const [canRetry, setCanRetry] = useState(!isCircuitBreakerError);

  // Countdown timer for circuit breaker retry
  useEffect(() => {
    if (!isCircuitBreakerError || !retryAfterSeconds) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanRetry(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCircuitBreakerError, retryAfterSeconds]);

  const getErrorMessage = (): string => {
    if (isCircuitBreakerError) {
      return 'O serviço está temporariamente indisponível devido a problemas recorrentes.';
    }
    
    if (!error) {
      return 'Não foi possível carregar os dados.';
    }

    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('timeout')) {
      return 'O servidor demorou muito para responder.';
    }
    if (errorMsg.includes('network')) {
      return 'Problema de conexão com o servidor.';
    }
    if (errorMsg.includes('circuit')) {
      return 'O serviço está temporariamente indisponível.';
    }
    
    return 'Ocorreu um erro ao carregar os dados.';
  };

  const getErrorIcon = () => {
    if (isCircuitBreakerError || error?.message.includes('circuit')) {
      return <WifiOff className="h-12 w-12 text-warning" />;
    }
    return <AlertCircle className="h-12 w-12 text-destructive" />;
  };

  const getErrorType = () => {
    if (isCircuitBreakerError) return 'Serviço Temporariamente Indisponível';
    if (error?.message.includes('timeout')) return 'Timeout da Requisição';
    if (error?.message.includes('network')) return 'Erro de Conexão';
    return 'Erro ao Carregar Dados';
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
      {/* Icon */}
      <div className="mb-4 flex items-center justify-center rounded-full bg-background border border-border p-6">
        {getErrorIcon()}
      </div>

      {/* Error Type */}
      <h3 className="text-xl font-semibold mb-2">{getErrorType()}</h3>

      {/* Error Message */}
      <p className="text-muted-foreground mb-4 max-w-md">
        {getErrorMessage()}
      </p>

      {/* Retry Timer for Circuit Breaker */}
      {isCircuitBreakerError && timeLeft > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          Tentando novamente em {timeLeft} {timeLeft === 1 ? 'segundo' : 'segundos'}...
        </div>
      )}

      {/* Retry Button */}
      {canRetry && onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      )}

      {/* Cached Data Notice */}
      {showCachedData && cachedData && (
        <div className="mt-4 text-xs text-muted-foreground">
          Exibindo dados em cache do último carregamento
        </div>
      )}

      {/* Debug Information (development only) */}
      {import.meta.env.DEV && error && (
        <details className="mt-6 text-left">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Detalhes do erro (desenvolvimento)
          </summary>
          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-w-md">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Hook for managing API fallback state with retry logic
 */
export function useApiFallback<T>(
  fetchFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    fallbackDuration?: number;
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    fallbackDuration = 30000, // 30 seconds in fallback mode
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const retry = async () => {
    if (retryCount >= maxRetries) {
      setIsFallbackMode(true);
      return;
    }

    setRetryCount(prev => prev + 1);
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
      setIsFallbackMode(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (retryCount >= maxRetries - 1) {
        setIsFallbackMode(true);
        
        // Auto-retry after fallback duration
        setTimeout(() => {
          setRetryCount(0);
          setIsFallbackMode(false);
        }, fallbackDuration);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const immediateRetry = () => {
    setRetryCount(0);
    setIsFallbackMode(false);
  };

  return {
    data,
    error,
    isLoading,
    isFallbackMode,
    retry,
    immediateRetry,
    retryCount,
    maxRetries,
  };
}
