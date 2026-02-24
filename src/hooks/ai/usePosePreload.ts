/**
 * usePosePreload - Hook para pré-carregamento global do MediaPipe
 * 
 * Carrega as dependências e o modelo do MediaPipe em segundo plano
 * para reduzir o tempo de espera quando o usuário inicia um exercício.
 */

import { useState, useEffect, useCallback } from 'react';
import { poseDetectionService } from '@/services/ai/poseDetectionService';
import { fisioLogger as logger } from '@/lib/errors/logger';

export function usePosePreload() {
  const [isPreloading, setIsPreloading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const preload = useCallback(async () => {
    if (isReady || isPreloading) return;

    setIsPreloading(true);
    try {
      logger.info('[PosePreload] Iniciando pré-carregamento global...', null, 'PosePreload');
      
      // Inicializa o serviço que carrega os módulos WASM e o Modelo
      await poseDetectionService.initialize();
      
      setIsReady(true);
      logger.info('[PosePreload] MediaPipe pré-carregado com sucesso', null, 'PosePreload');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Falha no pré-carregamento');
      setError(error);
      logger.error('Erro no pré-carregamento do MediaPipe', err, 'PosePreload');
    } finally {
      setIsPreloading(false);
    }
  }, [isReady, isPreloading]);

  return { preload, isReady, isPreloading, error };
}
