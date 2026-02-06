
/**
 * Hook para preload inteligente de rotas mais acessadas
 * Usa requestIdleCallback para não bloquear a UI
 */

import { useEffect } from 'react';

export const useIntelligentPreload = () => {
  useEffect(() => {
    // Rotas prioritárias para preload (baseado em padrões de uso)
    const priorityRoutes = [
      '/schedule',
      '/patients',
      '/exercises',
      '/eventos',
      '/tarefas',
    ];

    const preloadRoutes = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          priorityRoutes.forEach((route) => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = route;
            document.head.appendChild(link);
          });
        });
      }
    };

    // Preload após 2 segundos (usuário já interagiu)
    const timer = setTimeout(preloadRoutes, 2000);

    return () => clearTimeout(timer);
  }, []);
};

/**
 * Hook para preload de navegação
 * Usado no Sidebar para fazer prefetch de rotas ao passar o mouse
 */
export const useNavPreload = () => {
  const preloadRoute = (route: string) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    }
  };

  return { preloadRoute };
};
