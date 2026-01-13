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
