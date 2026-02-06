 
import { ReactNode } from 'react';
import { ErrorBoundaryContext, ErrorBoundaryContextValue } from '@/hooks/error/errorBoundaryContext';

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
 
