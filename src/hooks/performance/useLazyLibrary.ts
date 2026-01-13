/**
 * Hook para lazy loading de bibliotecas pesadas
 * Reduz o tamanho inicial do bundle carregando bibliotecas sob demanda
 *
 * @example
 * const { load, isLoaded, isLoading, error } = useLazyLibrary({
 *   importFn: () => import('@cornerstonejs/core'),
 *   moduleName: 'Cornerstone'
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseLazyLibraryOptions<T> {
  /** Função de importação dinâmica */
  importFn: () => Promise<T>;
  /** Nome do módulo para logging/erros */
  moduleName: string;
  /** Timeout em ms (padrão: 10000) */
  timeout?: number;
}

interface UseLazyLibraryReturn<T> {
  /** Carrega a biblioteca */
  load: () => Promise<T | null>;
  /** Se a biblioteca foi carregada com sucesso */
  isLoaded: boolean;
  /** Se está carregando */
  isLoading: boolean;
  /** Erro de carregamento */
  error: Error | null;
  /** Módulo carregado */
  module: T | null;
}

/**
 * Hook para carregar bibliotecas pesadas sob demanda
 * Implementa cache, loading state, error handling e timeout
 */
export function useLazyLibrary<T>({
  importFn,
  moduleName,
  timeout = 10000,
}: UseLazyLibraryOptions<T>): UseLazyLibraryReturn<T> {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [module, setModule] = useState<T | null>(null);

  // Usar ref para evitar chamadas duplicadas
  const loadPromise = useRef<Promise<T> | null>(null);

  /**
   * Carrega a biblioteca com timeout
   */
  const load = useCallback(async (): Promise<T | null> => {
    // Retornar módulo em cache se já carregado
    if (module) {
      return module;
    }

    // Retornar promise em andamento se estiver carregando
    if (loadPromise.current) {
      return loadPromise.current;
    }

    setIsLoading(true);
    setError(null);

    loadPromise.current = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout ao carregar ${moduleName} após ${timeout}ms`));
      }, timeout);

      importFn()
        .then((mod) => {
          clearTimeout(timer);
          setModule(mod);
          setIsLoaded(true);
          setIsLoading(false);
          resolve(mod);
          console.log(`[useLazyLibrary] ${moduleName} carregado com sucesso`);
        })
        .catch((err) => {
          clearTimeout(timer);
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          console.error(`[useLazyLibrary] Erro ao carregar ${moduleName}:`, error);
          reject(error);
        })
        .finally(() => {
          loadPromise.current = null;
        });
    });

    return loadPromise.current;
  }, [importFn, moduleName, timeout, module]);

  /**
   * Cleanup do timer se o componente desmontar durante carregamento
   */
  useEffect(() => {
    return () => {
      loadPromise.current = null;
    };
  }, []);

  return {
    load,
    isLoaded,
    isLoading,
    error,
    module,
  };
}

/**
 * Hook específico para Cornerstone.js
 */
export function useCornerstone() {
  return useLazyLibrary({
    importFn: () => import('@cornerstonejs/core'),
    moduleName: 'Cornerstone Core',
    timeout: 15000,
  });
}

/**
 * Hook específico para MediaPipe Pose
 */
export function useMediaPipePose() {
  return useLazyLibrary({
    importFn: () => import('@mediapipe/pose'),
    moduleName: 'MediaPipe Pose',
    timeout: 20000,
  });
}

/**
 * Hook específico para MediaPipe Tasks Vision
 */
export function useMediaPipeVision() {
  return useLazyLibrary({
    importFn: () => import('@mediapipe/tasks-vision'),
    moduleName: 'MediaPipe Vision',
    timeout: 20000,
  });
}

/**
 * Hook específico para Konva
 */
export function useKonva() {
  return useLazyLibrary({
    importFn: () => import('konva'),
    moduleName: 'Konva',
    timeout: 10000,
  });
}

/**
 * Hook específico para React PDF
 */
export function useReactPDF() {
  return useLazyLibrary({
    importFn: () => import('@react-pdf/renderer'),
    moduleName: 'React PDF',
    timeout: 10000,
  });
}

/**
 * Hook específico para jspdf
 */
export function useJsPDF() {
  return useLazyLibrary({
    importFn: () => import('jspdf'),
    moduleName: 'jsPDF',
    timeout: 10000,
  });
}

/**
 * Hook específico para XLSX
 */
export function useXLSX() {
  return useLazyLibrary({
    importFn: () => import('xlsx'),
    moduleName: 'XLSX',
    timeout: 10000,
  });
}
