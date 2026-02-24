/**
 * PosePreloadManager - Componente de infraestrutura para pré-carregamento
 * 
 * Inicia o pré-carregamento do MediaPipe quando o usuário está logado.
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePosePreload } from '@/hooks/ai/usePosePreload';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const PosePreloadManager = () => {
  const { user } = useAuth();
  const { preload, isReady, isPreloading } = usePosePreload();

  useEffect(() => {
    // Inicia o pré-carregamento apenas se o usuário estiver logado
    // e o sistema ainda não estiver pronto ou carregando
    if (user && !isReady && !isPreloading) {
      // Pequeno delay para priorizar o carregamento inicial do dashboard
      const timer = setTimeout(() => {
        logger.info('[PosePreloadManager] Iniciando pré-carregamento agendado...', null, 'PosePreload');
        preload();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, isReady, isPreloading, preload]);

  // Este componente não renderiza nada visualmente
  return null;
};
