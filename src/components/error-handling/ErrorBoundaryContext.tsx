/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode } from 'react';

interface ErrorBoundaryContextValue {
  reset: () => void;
  error: Error | null;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

interface ProviderProps {
  value: ErrorBoundaryContextValue;
  children: ReactNode;
}

export function Provider({ value, children }: ProviderProps) {
  return (
    <ErrorBoundaryContext.Provider value={value}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
}

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
