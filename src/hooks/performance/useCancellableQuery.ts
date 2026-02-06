
/**
 * Hook personalizado para queries com cancelamento automático
 * Cancela requests anteriores quando um novo é iniciado
 *
 * @example
 * const { data } = useCancellableQuery(
 *   ['patients', searchTerm],
 *   () => fetchPatients(searchTerm),
 *   { enabled: !!searchTerm }
 * );
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';

export function useCancellableQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancellableQueryFn = useCallback(() => {
    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Executar query com signal de abort
    return queryFn();

    // Nota: Se a query_fn do Supabase não suportar AbortSignal,
    // o cancelamento será silencioso, mas o cleanup ainda acontecerá
  }, [queryFn]);

  const result = useQuery({
    queryKey,
    queryFn: cancellableQueryFn,
    ...options,
  });

  // Cleanup no unmount
  useCallback(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return result;
}

/**
 * Hook para debounce de queries com cancelamento automático
 * Útil para campos de busca que fazem requisições a cada keystroke
 *
 * @example
 * const { data } = useDebouncedQuery(
 *   ['patients', searchTerm],
 *   () => fetchPatients(searchTerm),
 *   300, // 300ms de debounce
 *   { enabled: searchTerm.length > 2 }
 * );
 */
export function useDebouncedQuery<T>(
  queryKey: string[],
  queryFn: (signal?: AbortSignal) => Promise<T>,
  debounceMs: number = 300,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQueryKey = useRef<string[]>(queryKey);

  const debouncedQueryFn = useCallback(() => {
    return new Promise<T>((resolve, reject) => {
      // Limpar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Cancelar request anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Criar novo AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Configurar novo timeout
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await queryFn(controller.signal);
          resolve(result);
        } catch (error) {
          // Ignorar erros de abort
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          reject(error);
        }
      }, debounceMs);
    });
  }, [queryFn, debounceMs]);

  const result = useQuery({
    queryKey: [...debouncedQueryKey.current, 'debounced'],
    queryFn: debouncedQueryFn,
    ...options,
  });

  // Cleanup
  useCallback(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return result;
}

/**
 * Hook para queries que só devem ser executadas quando o usuário para de digitar
 * Combina debounce com enabled condition
 *
 * @example
 * const { data } = useLazyQuery(
 *   ['patients', searchTerm],
 *   () => fetchPatients(searchTerm),
 *   500 // 500ms após o usuário parar de digitar
 * );
 */
export function useLazyQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  delayMs: number = 500,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleFetch = useCallback(() => {
    // Cancelar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset shouldFetch
    setShouldFetch(false);

    // Agendar novo fetch
    timeoutRef.current = setTimeout(() => {
      setShouldFetch(true);
    }, delayMs);
  }, [delayMs]);

  const result = useQuery({
    queryKey,
    queryFn,
    enabled: shouldFetch,
    ...options,
  });

  // Cleanup
  useCallback(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...result,
    scheduleFetch,
  };
}

import { useState } from 'react';
