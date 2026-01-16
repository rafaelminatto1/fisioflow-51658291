/**
 * Hooks de Performance e Otimização
 *
 * Coleção de hooks para melhorar performance e reduzir uso de memória
 */

// Lazy loading de bibliotecas pesadas
export {
  useLazyLibrary,
  useCornerstone,
  useMediaPipePose,
  useMediaPipeVision,
  useKonva,
  useReactPDF,
  useJsPDF,
  useXLSX,
} from './useLazyLibrary';

// Debounce - adia execução até parar de receber eventos
export { useDebounce, useDebouncedCallback, useDebounceWithPending } from './useDebounce';

// Throttle - limita frequência de execução
export { useThrottle, useThrottledCallback, useScrollThrottle, useResizeThrottle } from './useThrottle';

// Virtualização de listas
export { useVirtualizedList, useLazyList } from './useVirtualizedList';

// Otimização de listas e paginação
export { useOptimizedList, usePagination } from './useOptimizedList';

// Intersection Observer para lazy loading
export {
  useIntersectionObserver,
  useLazyRender,
  useInfiniteScroll,
  useAnimateOnScroll
} from './useIntersectionObserver';

// Memoização avançada
export {
  usePrevious,
  useTrackedMemo,
  useMemoWithTTL,
  useInvalidableCallback,
  useMultiMemo,
  usePersistentMemo,
  useThrottledValue,
  usePromiseMemo,
  useDeepMemo,
  useConditionalMemo,
} from './useMemoAdvanced';

// React Query otimizado
export {
  QueryConfig,
  useStableQuery,
  useStaticQuery,
  useOptimizedQuery,
  useFrequentQuery,
  useBatchRefetch,
  useOptimizedMutation,
  usePrefetch,
  useOptimisticCache,
  useInfiniteScrollOptimized,
  createQueryKeys,
  QueryKeys,
} from './useReactQueryOptimized';

// Prefetching inteligente
export {
  usePrefetchOnHover,
  usePrefetchRelated,
  usePrefetchMultiple,
  usePrefetchOnProximity,
  usePrefetchPatientData,
  usePrefetchUpcomingAppointments,
  usePrefetchEvolutionTemplates,
  PrefetchOnHover,
} from './usePrefetch';

// Queries com cancelamento automático
export {
  useCancellableQuery,
  useDebouncedQuery,
  useLazyQuery,
} from './useCancellableQuery';

// Deduplicação de queries
export {
  useDeduplicatedQuery,
  useDeduplicatedPrefetch,
  useBatchDeduplicatedQuery,
  useInvalidateDeduplicatedCache,
  useDeduplicationStats,
} from './useQueryDeduplication';

// Optimistic mutations
export {
  useOptimisticMutation,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
  type OptimisticMutationContext,
  type OptimisticMutationOptions,
} from '../useOptimisticMutation';
