/**
 * Hooks otimizados para React Query
 *
 * Configurações e helpers para queries com cache otimizado
 * reduzindo chamadas desnecessárias à API
 */
import {

  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';

/**
 * Configurações padrão para diferentes tipos de queries
 */
export const QueryConfig = {
  /** Dados que raramente mudam (ex: lista de convênios) */
  stable: {
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  } as const,

  /** Dados que mudam ocasionalmente (ex: perfil do usuário) */
  static: {
    staleTime: 1000 * 60 * 15, // 15 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
    refetchOnWindowFocus: false,
  } as const,

  /** Dados que mudam com alguma frequência (ex: lista de pacientes) */
  normal: {
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: true,
  } as const,

  /** Dados que mudam frequentemente (ex: agendamentos de hoje) */
  frequent: {
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } as const,

  /** Dados em tempo real (ex: assuntos websocket) */
  realtime: {
    staleTime: 0, // Sempre considerado obsoleto
    gcTime: 1000 * 10, // 10 segundos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 5, // Poll a cada 5s como fallback
  } as const,
} as const;

/**
 * Hook otimizado para queries estáveis
 * Use para dados que raramente mudam
 */
export function useStableQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery(queryKey, queryFn, {
    ...QueryConfig.stable,
    ...options,
  });
}

/**
 * Hook otimizado para queries estáticas
 * Use para dados que mudam ocasionalmente
 */
export function useStaticQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery(queryKey, queryFn, {
    ...QueryConfig.static,
    ...options,
  });
}

/**
 * Hook otimizado para queries normais
 * Use para a maioria das queries
 */
export function useOptimizedQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery(queryKey, queryFn, {
    ...QueryConfig.normal,
    ...options,
  });
}

/**
 * Hook otimizado para queries frequentes
 * Use para dados que mudam com frequência
 */
export function useFrequentQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery(queryKey, queryFn, {
    ...QueryConfig.frequent,
    ...options,
  });
}

/**
 * Hook para invalidar e refetchar múltiplas queries de uma vez
 * Mais eficiente que invalidateQueries múltiplas
 */
export function useBatchRefetch() {
  const queryClient = useQueryClient();

  return {
    refetchAll: async (filters?: { predicate?: (query: Query) => boolean }) => {
      await queryClient.refetchQueries(filters);
    },
    invalidateAll: async (filters?: { predicate?: (query: Query) => boolean }) => {
      await queryClient.invalidateQueries(filters);
    },
    refetchQueries: async (queryKeys: QueryKey[]) => {
      await Promise.all(
        queryKeys.map(key => queryClient.refetchQueries({ queryKey: key }))
      );
    },
    invalidateQueries: async (queryKeys: QueryKey[]) => {
      await Promise.all(
        queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
      );
    },
  };
}

/**
 * Hook para mutations com invalidação automática de queries relacionadas
 */
export function useOptimizedMutation<TData, TError, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    /** Queries para invalidar após sucesso */
    invalidateQueries?: QueryKey[];
    /** Queries para refetch após sucesso */
    refetchQueries?: QueryKey[];
    /** Mensagem de sucesso (opcional) */
    successMessage?: string;
    /** Callback após sucesso */
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    /** Callback após erro */
    onError?: (error: TError, variables: TVariables) => void | Promise<void>;
  } = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      // Invalidar queries relacionadas
      if (options.invalidateQueries) {
        await Promise.all(
          options.invalidateQueries.map(key =>
            queryClient.invalidateQueries({ queryKey: key })
          )
        );
      }

      // Refetch queries relacionadas
      if (options.refetchQueries) {
        await Promise.all(
          options.refetchQueries.map(key =>
            queryClient.refetchQueries({ queryKey: key })
          )
        );
      }

      // Callback customizado
      if (options.onSuccess) {
        await options.onSuccess(data, variables);
      }
    },
    onError: options.onError,
  } as UseMutationOptions<TData, TError, TVariables, TContext>);
}

/**
 * Hook para prefetch de dados
 * Útil para carregar dados antes que o usuário precise deles
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  return {
    prefetchQuery: <T>(
      queryKey: QueryKey,
      queryFn: () => Promise<T>,
      options?: { staleTime?: number }
    ) => {
      queryClient.prefetchQuery(queryKey, queryFn, {
        staleTime: options?.staleTime || QueryConfig.normal.staleTime,
      });
    },
    prefetchInfiniteQuery: <T>(
      queryKey: QueryKey,
      queryFn: () => Promise<T>,
      options?: { staleTime?: number }
    ) => {
      queryClient.prefetchInfiniteQuery(queryKey, queryFn, {
        staleTime: options?.staleTime || QueryConfig.normal.staleTime,
      });
    },
  };
}

/**
 * Hook para cache de dados que podem ser atualizados otimisticamente
 */
export function useOptimisticCache<T>(queryKey: QueryKey) {
  const queryClient = useQueryClient();

  return {
    /** Atualiza o cache otimisticamente */
    setOptimisticData: (updater: (old: T | undefined) => T) => {
      queryClient.setQueryData(queryKey, updater);
    },
    /** Cancela queries em andamento para esta key */
    cancelQuery: () => {
      queryClient.cancelQueries({ queryKey });
    },
    /** Reseta o cache para esta key */
    resetCache: () => {
      queryClient.resetQueries({ queryKey });
    },
    /** Obtém os dados em cache sem fazer fetch */
    getCachedData: (): T | undefined => {
      return queryClient.getQueryData(queryKey);
    },
  };
}

/**
 * Hook para infinite scroll com React Query
 * Otimizado para não buscar mais dados se já tiver todos
 */
export function useInfiniteScrollOptimized<T>(
  queryKey: QueryKey,
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<{
    data: T[];
    nextPage?: number;
    hasMore: boolean;
  }>,
  _options?: {
    /** Número de itens por página */
    pageSize?: number;
    /** Quantidade de páginas para prefetch */
    prefetchPages?: number;
  }
) {
  // Prefetch pages available in options

  return useQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.nextPage;
      }
      return undefined;
    },
  });
}

/**
 * Helper para criar query keys de forma consistente
 */
export function createQueryKeys(baseKey: string) {
  return {
    all: [baseKey] as const,
    lists: () => [baseKey, 'list'] as const,
    list: (filters: unknown) => [baseKey, 'list', filters] as const,
    details: () => [baseKey, 'detail'] as const,
    detail: (id: string | number) => [baseKey, 'detail', id] as const,
  } as const;
}

/**
 * Query keys para recursos comuns
 */
export const QueryKeys = {
  patients: createQueryKeys('patients'),
  appointments: createQueryKeys('appointments'),
  users: createQueryKeys('users'),
  organizations: createQueryKeys('organizations'),
  exercises: createQueryKeys('exercises'),
  protocols: createQueryKeys('protocols'),
  financial: createQueryKeys('financial'),
  reports: createQueryKeys('reports'),
} as const;
