/**
 * Error Fallback Component
 *
 * @description
 * Default UI shown when an error is caught by an Error Boundary
 *
 * @module components/error-boundaries/ErrorFallback
 */

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({ error, resetError, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate();

  const handleReset = () => {
    resetError();
    resetErrorBoundary?.();
  };

  const handleGoHome = () => {
    navigate('/');
    resetError();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertCircle className="w-16 h-16 text-destructive" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Algo deu errado
          </h1>
          <p className="text-muted-foreground">
            Ocorreu um erro inesperado. Por favor, tente novamente ou entre em
              contato com o suporte se o problema persistir.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {import.meta.env.DEV && error.message && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Ver detalhes do erro
            </summary>
            <pre className="mt-2 p-3 rounded-md bg-muted text-xs overflow-auto max-h-32">
              {error.stack || error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleReset}
            variant="default"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Ir para o início
          </Button>
        </div>
      </div>
    </div>
  );
}
