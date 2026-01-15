/**
 * VirtualizedList - Componente de lista virtualizada
 * Renderiza apenas os itens visíveis na tela, drasticamente melhorando performance
 *
 * @example
 * <VirtualizedList
 *   items={largeArray}
 *   itemHeight={50}
 *   containerHeight={400}
 *   renderItem={(item) => <div>{item.name}</div>}
 *   keyExtractor={(item) => item.id}
 * />
 */

import { useMemo, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/hooks/performance/useDebounce';

/**
 * Throttle otimizado para scroll usando requestAnimationFrame
 * Mais eficiente que setTimeout para eventos de scroll
 */
function useScrollThrottle(callback: (scrollTop: number) => void, delay: number = 16) {
  const rafRef = useRef<number>();
  const lastRunRef = useRef<number>(Date.now());
  const pendingValueRef = useRef<number>();

  return useCallback((value: number) => {
    pendingValueRef.current = value;

    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= delay) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      callback(value);
      lastRunRef.current = now;
      pendingValueRef.current = undefined;
    } else if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingValueRef.current !== undefined) {
          callback(pendingValueRef.current);
          lastRunRef.current = Date.now();
          pendingValueRef.current = undefined;
        }
        rafRef.current = undefined;
      });
    }
  }, [callback, delay]);
}

interface VirtualizedListProps<T> {
  /** Lista completa de itens */
  items: T[];
  /** Altura de cada item em pixels (pode ser função para alturas variáveis) */
  itemHeight: number | ((item: T, index: number) => number);
  /** Altura do container visível em pixels */
  containerHeight: number;
  /** Render function para cada item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor para cada item */
  keyExtractor: (item: T, index: number) => string;
  /** Número de itens extras para renderizar antes/depois da área visível (buffer) */
  overscan?: number;
  /** ClassName para o container */
  className?: string;
  /** Callback quando scroll para o final */
  onEndReached?: () => void;
  /** Distância do final para disparar onEndReached (pixels) */
  onEndReachedThreshold?: number;
  /** Render function para header */
  renderHeader?: () => React.ReactNode;
  /** Render function para footer */
  renderFooter?: () => React.ReactNode;
  /** Render function para item vazio */
  renderEmpty?: () => React.ReactNode;
  /** Render function para loading */
  renderLoading?: () => React.ReactNode;
  /** Mostrar loading */
  isLoading?: boolean;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 3,
  className,
  onEndReached,
  onEndReachedThreshold = 200,
  renderHeader,
  renderFooter,
  renderEmpty,
  renderLoading,
  isLoading = false,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Memoizar altura total e item heights com prefix sums O(1)
  const { totalHeight, itemHeights, getItemOffset } = useMemo(() => {
    const heights: number[] = [];
    const offsets: number[] = [0]; // Prefix sum array - offset[i] = soma de heights[0..i-1]
    let currentOffset = 0;

    // Calcular alturas e prefix sums em uma única passagem O(n)
    for (let i = 0; i < items.length; i++) {
      const height = typeof itemHeight === 'function'
        ? (itemHeight as (item: T, index: number) => number)(items[i], i)
        : itemHeight;
      heights.push(height);
      currentOffset += height;
      offsets.push(currentOffset);
    }

    // Função O(1) para obter offset de um item usando prefix sums
    const getOffset = (index: number) => {
      if (index < 0) return 0;
      if (index >= offsets.length) return offsets[offsets.length - 1];
      return offsets[index];
    };

    return {
      totalHeight: currentOffset,
      itemHeights: heights,
      getItemOffset: getOffset,
    };
  }, [items, itemHeight]);

  // Calcular itens visíveis
  const { visibleItems, _startIndex, _endIndex } = useMemo(() => {
    const getItemHeightLocal = (index: number) => itemHeights[index] || 50;

    let startNode = 0;
    let currentOffset = 0;

    // Encontrar primeiro item visível
    while (startNode < items.length && currentOffset + getItemHeightLocal(startNode) < scrollTop) {
      currentOffset += getItemHeightLocal(startNode);
      startNode++;
    }

    // Adicionar overscan
    startNode = Math.max(0, startNode - overscan);

    // Encontrar último item visível
    let endNode = startNode;
    currentOffset = getItemOffset(startNode);

    while (endNode < items.length && currentOffset < scrollTop + containerHeight) {
      currentOffset += getItemHeightLocal(endNode);
      endNode++;
    }

    // Adicionar overscan
    endNode = Math.min(items.length - 1, endNode + overscan);

    // Criar array de itens visíveis
    const visible: Array<{ item: T; index: number; offset: number }> = [];

    for (let i = startNode; i <= endNode; i++) {
      visible.push({
        item: items[i],
        index: i,
        offset: getItemOffset(i),
      });
    }

    return {
      visibleItems: visible,
      startIndex: _startIndex,
      endIndex: _endIndex,
    };
  }, [items, itemHeights, scrollTop, containerHeight, overscan, getItemOffset]);

  // Handler de scroll otimizado com RAF-based throttle
  const throttledSetScrollTop = useScrollThrottle(setScrollTop, 16); // ~60fps

  const noop = useCallback(() => { }, []);
  const debouncedOnEndReached = useDebouncedCallback(onEndReached || noop, 300);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;

    // Atualizar scrollTop com throttle
    throttledSetScrollTop(currentScrollTop);

    // Verificar se chegou ao final para onEndReached (sem debounce para resposta rápida)
    if (onEndReached && !isLoading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      if (scrollHeight - currentScrollTop - clientHeight < onEndReachedThreshold) {
        if (onEndReached) {
          debouncedOnEndReached();
        }
      }
    }
  }, [throttledSetScrollTop, onEndReached, isLoading, onEndReachedThreshold, debouncedOnEndReached]);

  // Estado vazio
  if (items.length === 0 && !isLoading) {
    return renderEmpty ? (
      <div className={cn('flex items-center justify-center', className)} style={{ height: containerHeight }}>
        {renderEmpty()}
      </div>
    ) : null;
  }

  return (
    <div className={className}>
      {renderHeader?.()}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ height: containerHeight }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map(({ item, index, offset }) => (
            <div
              key={keyExtractor(item, index)}
              style={{
                position: 'absolute',
                top: offset,
                left: 0,
                right: 0,
                height: itemHeights[index] || itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>

        {isLoading && renderLoading?.()}
      </div>

      {renderFooter?.()}
    </div>
  );
}

/**
 * Hook para usar lista virtualizada com scroll infinito
 */
export function useVirtualizedList<T>(
  items: T[],
  _options: {
    itemHeight: number | ((item: T, index: number) => number);
    containerHeight: number;
    overscan?: number;
  }
) {
  const [visibleItems, setVisibleItems] = useState<{
    items: T[];
    startIndex: number;
    endIndex: number;
  }>({
    items: items.slice(0, 20),
    startIndex: 0,
    endIndex: 20,
  });

  const loadMore = useCallback((startIndex: number, endIndex: number) => {
    const newItems = items.slice(startIndex, endIndex);
    setVisibleItems({
      items: newItems,
      startIndex,
      endIndex,
    });
  }, [items]);

  return {
    visibleItems: visibleItems.items,
    startIndex: visibleItems.startIndex,
    endIndex: visibleItems.endIndex,
    loadMore,
    totalItems: items.length,
  };
}

export default VirtualizedList;
