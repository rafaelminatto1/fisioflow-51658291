import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

/**
 * Gerenciador de deduplicação de queries
 * Evita requisições duplicadas para a mesma query key
 */
class QueryDeduplicationManager {
  private pendingQueries = new Map<string, Promise<unknown>>();
  private completedQueries = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTimeout = 5000; // 5 segundos

  /**
   * Obtém uma query existente ou cria uma nova
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Verificar se já existe uma query pendente
    const pending = this.pendingQueries.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Verificar cache recente
    const cached = this.completedQueries.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }

    // Criar nova query
    const promise = fetcher().finally(() => {
      // Remover dos pendentes e adicionar aos completados
      this.pendingQueries.delete(key);
      promise.then((data) => {
        this.completedQueries.set(key, { data, timestamp: Date.now() });
      });
    });

    this.pendingQueries.set(key, promise);
    return promise;
  }

  /**
   * Limpa caches antigos
   */
  clearOldCache(): void {
    const now = Date.now();
    for (const [key, value] of this.completedQueries.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.completedQueries.delete(key);
      }
    }
  }

  /**
   * Limpa todos os caches
   */
  clearAll(): void {
    this.pendingQueries.clear();
    this.completedQueries.clear();
  }

  /**
   * Invalida uma chave específica
   */
  invalidate(key: string): void {
    this.pendingQueries.delete(key);
    this.completedQueries.delete(key);
  }
}

// Instância global do gerenciador
const dedupManager = new QueryDeduplicationManager();

// Limpeza periódica de cache antigo
if (typeof window !== 'undefined') {
  setInterval(() => {
    dedupManager.clearOldCache();
  }, 30000); // A cada 30 segundos
}

/**
 * Hook para queries com deduplicação automática
 * Útil para múltiplos componentes que precisam dos mesmos dados
 *
 * @example
 * // Em múltiplos componentes:
 * const { data: user } = useDeduplicatedQuery(
 *   'user-current',
 *   () => fetch('/api/user/current').then(r => r.json())
 * );
 *
 * // A query só será executada uma vez, não importa quantos componentes usem
 */
export function useDeduplicatedQuery<T>(
  deduplicationKey: string,
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  const queryClient = useQueryClient();
  const fetchCountRef = useRef(0);

  const queryKey = useMemo(() => ['deduplicated', deduplicationKey], [deduplicationKey]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      fetchCountRef.current++;

      // Usar gerenciador de deduplicação
      const result = await dedupManager.getOrFetch(deduplicationKey, queryFn);

      // Atualizar cache do TanStack Query também
      queryClient.setQueryData(queryKey, result);

      return result;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutos
    gcTime: options?.gcTime ?? 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para prefetch com deduplicação
 * Carrega dados antecipadamente apenas se não estiverem em cache
 */
export function useDeduplicatedPrefetch<T>(
  deduplicationKey: string,
  queryFn: () => Promise<T>,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  const prefetch = useMemo(() => {
    return () => {
      if (!enabled) return;

      // Verificar se já está em cache
      const cached = queryClient.getQueryData(['deduplicated', deduplicationKey]);
      if (cached) return;

      // Prefetch com deduplicação
      dedupManager.getOrFetch(deduplicationKey, queryFn).then((data) => {
        queryClient.setQueryData(['deduplicated', deduplicationKey], data);
      });
    };
  }, [deduplicationKey, queryFn, enabled, queryClient]);

  return { prefetch };
}

/**
 * Hook para batch de queries com deduplicação
 * Executa múltiplas queries em paralelo mas evita duplicatas
 *
 * @example
 * const { data } = useBatchDeduplicatedQuery({
 *   patients: () => fetch('/api/patients').then(r => r.json()),
 *   appointments: () => fetch('/api/appointments').then(r => r.json()),
 *   stats: () => fetch('/api/stats').then(r => r.json()),
 * });
 */
export function useBatchDeduplicatedQuery<T extends Record<string, unknown>>(
  queries: {
    [K in keyof T]: () => Promise<T[K]>;
  },
  options?: {
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const queryKeys = useMemo(() => Object.keys(queries), [queries]);

  return useQuery({
    queryKey: ['batch-deduplicated', ...queryKeys],
    queryFn: async () => {
      const results = {} as T;

      // Executar todas as queries em paralelo com deduplicação
      const promises = Object.entries(queries).map(([key, fetcher]) =>
        dedupManager.getOrFetch(key, fetcher).then((data) => {
          results[key as keyof T] = data as T[keyof T];
        })
      );

      await Promise.all(promises);

      // Atualizar cache do TanStack Query
      Object.entries(results).forEach(([key, data]) => {
        queryClient.setQueryData(['deduplicated', key], data);
      });

      return results;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 2, // 2 minutos para batch queries
  });
}

/**
 * Hook para invalidar cache de deduplicação
 */
export function useInvalidateDeduplicatedCache() {
  const queryClient = useQueryClient();

  const invalidate = useMemo(() => {
    return (key?: string) => {
      if (key) {
        dedupManager.invalidate(key);
        queryClient.invalidateQueries({ queryKey: ['deduplicated', key] });
      } else {
        dedupManager.clearAll();
        queryClient.invalidateQueries({ queryKey: ['deduplicated'] });
      }
    };
  }, [queryClient]);

  return { invalidate };
}

/**
 * Hook para monitorar estatísticas de deduplicação
 * Útil para debugging e monitoramento
 */
export function useDeduplicationStats() {
  const stats = useMemo(() => {
    return {
      pending: dedupManager['pendingQueries'].size,
      cached: dedupManager['completedQueries'].size,
      cacheKeys: Array.from(dedupManager['completedQueries'].keys()),
    };
  }, []);

  // Atualizar stats a cada segundo (apenas para debug)
  // Em produção, remova este useEffect
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [, forceUpdate] = useState(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const interval = setInterval(() => forceUpdate((s) => s + 1), 1000);
      return () => clearInterval(interval);
    }, []);
  }

  return stats;
}
