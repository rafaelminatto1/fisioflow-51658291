import { useMemo } from 'react';

/**
 * Adiciona atributos de acessibilidade ao elemento principal
 */
export function MainContentProps() {
  return {
    id: 'main-content',
    tabIndex: -1,
    'aria-label': 'Conteúdo principal',
  };
}

/**
 * Hook para adicionar props de acessibilidade ao conteúdo principal
 */
export function useMainContentProps() {
  return useMemo(() => ({
    id: 'main-content',
    tabIndex: -1,
    'aria-label': 'Conteúdo principal',
  }), []);
}
