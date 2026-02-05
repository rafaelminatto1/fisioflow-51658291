/**
 * Página de erro dedicada - /error
 * Exibe informações de erro quando navegada via state (ex: navigate('/error', { state: { message, type } }))
 */

import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ErrorPageLayout } from '@/components/error/ErrorPageLayout';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ErrorState {
  message?: string;
  type?: string;
}

export default function ErrorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as ErrorState;

  const message =
    state.message ??
    'Ocorreu um erro inesperado. Tente novamente ou volte ao início.';

  const canGoBack = window.history.length > 1;

  return (
    <ErrorPageLayout
      title="Ops! Algo deu errado"
      message={message}
      primaryActionLabel="Início"
      primaryActionHref="/"
    >
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {canGoBack && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <RefreshCw className="h-4 w-4" />
            Voltar
          </Button>
        )}
      </div>
    </ErrorPageLayout>
  );
}
