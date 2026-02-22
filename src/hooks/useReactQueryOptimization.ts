/**
 * useReactQueryOptimization - Hooks otimizados para React Query
 *
 * Performance: Estratégias avançadas para TanStack Query
 * - Stale time configurável por tipo de dado
 * - Refetch on window focus
 * - Prefetching inteligente
 * - Cache warming
 * - Retry com backoff exponencial
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  QueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// CONFIGURAÇÕES DE CACHE POR TIPO DE DADO
// ============================================================================

export const CACHE_CONFIG = {
  // Agendamentos mudam com frequência
  appointments: {
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Dados de paciente são mais estáveis
  patients: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Exercícios mudam raramente
  exercises: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Estatísticas são calculadas, cache curto para atualizações
  stats: {
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Configurações são muito estáveis
  settings: {
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
} as const;

// ============================================================================
// HOOKS OTIMIZADOS
// ============================================================================

/**
 * useOptimizedQuery - Hook de query com configurações otimizadas
 */
export const useOptimizedQuery = <TData, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    cacheType?: keyof typeof CACHE_CONFIG;
  } = {}
) => {
  const { cacheType, ...queryOptions } = options;

  const defaultConfig = cacheType ? CACHE_CONFIG[cacheType] : undefined;

  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    staleTime: defaultConfig?.staleTime ?? 0,
    gcTime: defaultConfig?.gcTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: defaultConfig?.refetchOnWindowFocus ?? true,
    refetchOnReconnect: defaultConfig?.refetchOnReconnect ?? true,
    ...queryOptions,
  });
};

/**
 * useAppointmentsQuery - Query otimizada para agendamentos
 */
export const useAppointmentsQuery = (
  queryFn: () => Promise<any[]>,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useOptimizedQuery(['appointments'], queryFn, {
    cacheType: 'appointments',
    ...options,
  });
};

/**
 * usePatientsQuery - Query otimizada para pacientes
 */
export const usePatientsQuery = (
  queryFn: () => Promise<any[]>,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useOptimizedQuery(['patients'], queryFn, {
    cacheType: 'patients',
    ...options,
  });
};

/**
 * useExercisesQuery - Query otimizada para exercícios
 */
export const useExercisesQuery = (
  queryFn: () => Promise<any[]>,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useOptimizedQuery(['exercises'], queryFn, {
    cacheType: 'exercises',
    ...options,
  });
};

/**
 * useOptimizedMutation - Mutation com retry otimizado
 */
export const useOptimizedMutation = <TData, TError, TVariables, TContext = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TError, TVariables, TContext> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    retry: (failureCount, error) => {
      // Não retry em erros de autenticação
      if (error instanceof Error && error.message.includes('auth')) {
        return false;
      }
      // Retry até 3 vezes
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onSuccess: (data, variables, context) => {
      // Invalidar caches relevantes após sucesso
      queryClient.invalidateQueries({ refetchType: 'active' });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      options.onSettled?.(data, error, variables, context);
    },
  });
};

// ============================================================================
// PREFETCHING
// ============================================================================

/**
 * usePrefetchOnHover - Prefetch dados ao passar o mouse
 */
export const usePrefetchOnHover = (
  queryKey: unknown[],
  queryFn: () => Promise<unknown>,
  options?: { delay?: number }
) => {
  const { delay = 200 } = options;
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefetch = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: CACHE_CONFIG.patients.staleTime,
      });
    }, delay);
  }, [queryClient, queryKey, queryFn, delay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return prefetch;
};

/**
 * prefetchAppointments - Prefetch agendamentos
 */
export const prefetchAppointments = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: ['appointments'],
    queryFn: async () => [], // Substituir por query real
    staleTime: CACHE_CONFIG.appointments.staleTime,
  });
};

/**
 * prefetchPatients - Prefetch pacientes
 */
export const prefetchPatients = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: ['patients'],
    queryFn: async () => [], // Substituir por query real
    staleTime: CACHE_CONFIG.patients.staleTime,
  });
};

/**
 * prefetchExercises - Prefetch exercícios
 */
export const prefetchExercises = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: ['exercises'],
    queryFn: async () => [], // Substituir por query real
    staleTime: CACHE_CONFIG.exercises.staleTime,
  });
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * useCacheManagement - Hooks para gerenciar cache
 */
export const useCacheManagement = () => {
  const queryClient = useQueryClient();

  const clearCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  const invalidateQueries = useCallback((key: string) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  }, [queryClient]);

  const removeQueries = useCallback((key: string) => {
    queryClient.removeQueries({ queryKey: [key] });
  }, [queryClient]);

  const resetQueries = useCallback((key?: string) => {
    queryClient.resetQueries(key ? { queryKey: [key] } : undefined);
  }, [queryClient]);

  const getCacheData = useCallback((key: unknown[]) => {
    return queryClient.getQueryData(key);
  }, [queryClient]);

  const setCacheData = useCallback((key: unknown[], data: unknown) => {
    queryClient.setQueryData(key, data);
  }, [queryClient]);

  return {
    clearCache,
    invalidateAll,
    invalidateQueries,
    removeQueries,
    resetQueries,
    getCacheData,
    setCacheData,
  };
};

/**
 * useCacheStats - Estatísticas do cache
 */
export const useCacheStats = () => {
  const queryClient = useQueryClient();

  const stats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      staleQueries: queries.filter(q => q.isStale()).length,
      inactiveQueries: queries.filter(q => !q.getObserversCount()).length,
      cacheSize: JSON.stringify(queries).length, // bytes aproximados
    };
  }, [queryClient]);

  return stats;
};
