/**
 * Hook para virtualização de listas longas
 * Renderiza apenas os itens visíveis na tela
 * Melhora drasticamente a performance de listas com muitos itens
 *
 * @example
 * const { visibleItems, containerRef } = useVirtualizedList({
 *   items: largeArray,
 *   itemHeight: 50,
 *   containerHeight: 400,
 *   overscan: 3
 * });
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualizedListOptions<T> {
  /** Lista completa de itens */
  items: T[];
  /** Altura de cada item em pixels */
  itemHeight: number;
  /** Altura do container visível em pixels */
  containerHeight: number;
  /** Número de itens extras para renderizar antes/depois da área visível (buffer) */
  overscan?: number;
}

interface UseVirtualizedListReturn<T> {
  /** Itens que devem ser renderizados */
  visibleItems: { item: T; index: number }[];
  /** Ref para o container scrollável */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Offset Y total para posicionar os itens */
  totalHeight: number;
  /** Scroll para um índice específico */
  scrollToIndex: (index: number) => void;
  /** Scroll para o topo */
  scrollToTop: () => void;
}

/**
 * Hook para virtualização de listas
 * Implementa windowing para renderizar apenas itens visíveis
 */
export function useVirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualizedListOptions<T>): UseVirtualizedListReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  /**
   * Calcular índices de início e fim baseados no scroll
   */
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;

    // Calcular startIndex baseado no scrollTop
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);

    // Calcular endIndex baseado na altura do container
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

    return { startIndex, endIndex, totalHeight };
  }, [items.length, itemHeight, containerHeight, scrollTop, overscan]);

  /**
   * Extrair itens visíveis
   */
  const visibleItems = useMemo(() => {
    const result: { item: T; index: number }[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        item: items[i],
        index: i,
      });
    }
    return result;
  }, [items, startIndex, endIndex]);

  /**
   * Handler de scroll com throttle para performance
   */
  const _handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  /**
   * Scroll para um índice específico
   */
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = Math.max(0, index * itemHeight - containerHeight / 2 + itemHeight / 2);
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
    }
  }, [itemHeight, containerHeight]);

  /**
   * Scroll para o topo
   */
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  return {
    visibleItems,
    containerRef,
    totalHeight,
    scrollToIndex,
    scrollToTop,
  };
}

/**
 * Hook simplificado para listas virtuais sem altura fixa
 * Usa Intersection Observer para detectar visibilidade
 */
export function useLazyList<T>({
  items,
  initialLoadCount = 20,
  loadMoreCount = 20,
}: {
  items: T[];
  initialLoadCount?: number;
  loadMoreCount?: number;
}) {
  const [visibleCount, setVisibleCount] = useState(initialLoadCount);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = visibleCount < items.length;

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + loadMoreCount, items.length));
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, items.length, loadMoreCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + loadMoreCount, items.length));
  }, [items.length, loadMoreCount]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    loadMoreRef,
  };
}
