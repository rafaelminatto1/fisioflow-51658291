import { createContext, useContext } from 'react';

export interface ErrorBoundaryContextValue {
  reset: () => void;
  error: Error | null;
}

export const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

/**
 * Hook para acessar o contexto do ErrorBoundary
 * Permite reset manual de erros de dentro de componentes
 */
export function useErrorBoundary() {
  const context = useContext(ErrorBoundaryContext);

  if (!context) {
    throw new Error('useErrorBoundary deve ser usado dentro de um ErrorBoundary');
  }

  return context;
}
