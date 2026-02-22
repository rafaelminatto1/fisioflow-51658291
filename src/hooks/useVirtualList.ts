/**
 * useVirtualList - Hook para listas virtuais customizadas
 *
 * Performance: Renderização otimizada de listas longas
 * - Altura de item dinâmica ou fixa
 * - Buffer (overscan) para scroll suave
 * - Posicionamento absoluto para performance
 * - Suporte a scroll horizontal e vertical
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualListOptions {
  itemHeight?: number | ((index: number) => number); // Altura fixa ou dinâmica
  overscan?: number; // Número de itens fora da viewport para renderizar
  estimatedItemHeight?: number; // Para alturas dinâmicas
}

interface VirtualListResult<T> {
  virtualItems: Array<{
    index: number;
    data: T;
    offsetTop: number;
    height: number;
  }>;
  totalHeight: number;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    ref: React.RefObject<HTMLDivElement>;
  };
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
}

/**
 * useVirtualList - Hook para listas virtuais
 */
export const useVirtualList = <T>(
  items: T[],
  options: VirtualListOptions = {}
): VirtualListResult<T> => {
  const {
    itemHeight: itemHeightProp = 50,
    overscan = 3,
    estimatedItemHeight = 50,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Detectar se altura é dinâmica
  const isDynamicHeight = typeof itemHeightProp === 'function';
  const itemHeight = isDynamicHeight ? estimatedItemHeight : itemHeightProp;

  // Calcular alturas dos itens (cache para performance)
  const itemHeights = useMemo(() => {
    if (!isDynamicHeight) return null;

    const heights = new Map<number, number>();
    let totalHeight = 0;

    items.forEach((_, index) => {
      const height = (itemHeightProp as (index: number) => number)(index);
      heights.set(index, height);
      totalHeight += height;
    });

    return { heights, totalHeight };
  }, [items, itemHeightProp, isDynamicHeight]);

  // Calcular posição de cada item
  const itemOffsets = useMemo(() => {
    if (!isDynamicHeight) {
      // Altura fixa - cálculo simples
      return items.map((_, index) => index * (itemHeight as number));
    }

    // Altura dinâmica - cálculo acumulado
    const offsets: number[] = [];
    let offset = 0;

    for (let i = 0; i < items.length; i++) {
      offsets.push(offset);
      offset += itemHeights!.heights.get(i) || estimatedItemHeight;
    }

    return offsets;
  }, [items, itemHeight, isDynamicHeight, itemHeights, estimatedItemHeight]);

  // Altura total da lista
  const totalHeight = useMemo(() => {
    if (!isDynamicHeight) {
      return items.length * (itemHeight as number);
    }
    return itemHeights!.totalHeight;
  }, [items, itemHeight, isDynamicHeight, itemHeights]);

  // Calcular itens visíveis
  const virtualItems = useMemo(() => {
    let startIndex = 0;
    let endIndex = items.length - 1;

    if (isDynamicHeight) {
      // Para alturas dinâmicas, busca binária
      let low = 0;
      let high = items.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (itemOffsets[mid] < scrollTop) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      startIndex = Math.max(0, low - overscan);

      // Encontrar endIndex
      const viewportEnd = scrollTop + containerHeight;
      low = 0;
      high = items.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (itemOffsets[mid] < viewportEnd) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      endIndex = Math.min(items.length - 1, high + overscan);
    } else {
      // Altura fixa - cálculo direto
      startIndex = Math.max(0, Math.floor(scrollTop / (itemHeight as number)) - overscan);
      endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / (itemHeight as number)) + overscan
      );
    }

    const result: VirtualListResult<T>['virtualItems'] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const height = isDynamicHeight
        ? itemHeights!.heights.get(i) || estimatedItemHeight
        : (itemHeight as number);

      result.push({
        index: i,
        data: items[i],
        offsetTop: itemOffsets[i],
        height,
      });
    }

    return result;
  }, [
    items,
    scrollTop,
    containerHeight,
    overscan,
    itemOffsets,
    isDynamicHeight,
    itemHeight,
    itemHeights,
    estimatedItemHeight,
  ]);

  // Handler de scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    scrollTopRef.current = target.scrollTop;
    setScrollTop(target.scrollTop);
  }, []);

  // Scroll para índice específico
  const scrollToIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      if (!containerRef.current || index < 0 || index >= items.length) return;

      const itemTop = itemOffsets[index];
      const itemHeightValue = isDynamicHeight
        ? itemHeights!.heights.get(index) || estimatedItemHeight
        : (itemHeight as number);

      let scrollPosition = itemTop;

      if (align === 'center') {
        scrollPosition = itemTop - containerHeight / 2 + itemHeightValue / 2;
      } else if (align === 'end') {
        scrollPosition = itemTop - containerHeight + itemHeightValue;
      }

      containerRef.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    },
    [itemOffsets, items.length, containerHeight, isDynamicHeight, itemHeights, estimatedItemHeight, itemHeight]
  );

  // Atualizar altura do container
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      setContainerHeight(container.clientHeight);
    }
  }, []);

  // Props do container
  const containerProps = useMemo(
    () => ({
      style: {
        height: '100%',
        overflow: 'auto',
        position: 'relative',
      } as React.CSSProperties,
      onScroll: handleScroll,
      ref: containerRef,
    }),
    [handleScroll]
  );

  return {
    virtualItems,
    totalHeight,
    containerProps,
    scrollToIndex,
  };
};

// ============================================================================
// VARIANTE PARA LISTA HORIZONTAL
// ============================================================================

interface VirtualListHorizontalOptions extends VirtualListOptions {
  itemWidth?: number | ((index: number) => number);
  estimatedItemWidth?: number;
}

export const useVirtualListHorizontal = <T>(
  items: T[],
  options: VirtualListHorizontalOptions = {}
): Omit<VirtualListResult<T>, 'containerProps'> & {
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    ref: React.RefObject<HTMLDivElement>;
  };
  totalWidth: number;
} => {
  const {
    itemWidth: itemWidthProp = 100,
    overscan = 3,
    estimatedItemWidth = 100,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const isDynamicWidth = typeof itemWidthProp === 'function';
  const itemWidth = isDynamicWidth ? estimatedItemWidth : itemWidthProp;

  const itemWidths = useMemo(() => {
    if (!isDynamicWidth) return null;

    const widths = new Map<number, number>();
    let totalWidth = 0;

    items.forEach((_, index) => {
      const width = (itemWidthProp as (index: number) => number)(index);
      widths.set(index, width);
      totalWidth += width;
    });

    return { widths, totalWidth };
  }, [items, itemWidthProp, isDynamicWidth]);

  const itemOffsets = useMemo(() => {
    if (!isDynamicWidth) {
      return items.map((_, index) => index * (itemWidth as number));
    }

    const offsets: number[] = [];
    let offset = 0;

    for (let i = 0; i < items.length; i++) {
      offsets.push(offset);
      offset += itemWidths!.widths.get(i) || estimatedItemWidth;
    }

    return offsets;
  }, [items, itemWidth, isDynamicWidth, itemWidths, estimatedItemWidth]);

  const totalWidth = useMemo(() => {
    if (!isDynamicWidth) {
      return items.length * (itemWidth as number);
    }
    return itemWidths!.totalWidth;
  }, [items, itemWidth, isDynamicWidth, itemWidths]);

  const virtualItems = useMemo(() => {
    let startIndex = 0;
    let endIndex = items.length - 1;

    if (isDynamicWidth) {
      let low = 0;
      let high = items.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (itemOffsets[mid] < scrollLeft) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      startIndex = Math.max(0, low - overscan);

      const viewportEnd = scrollLeft + containerWidth;
      low = 0;
      high = items.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (itemOffsets[mid] < viewportEnd) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      endIndex = Math.min(items.length - 1, high + overscan);
    } else {
      startIndex = Math.max(0, Math.floor(scrollLeft / (itemWidth as number)) - overscan);
      endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollLeft + containerWidth) / (itemWidth as number)) + overscan
      );
    }

    const result: Array<{ index: number; data: T; offsetLeft: number; width: number }> = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const width = isDynamicWidth
        ? itemWidths!.widths.get(i) || estimatedItemWidth
        : (itemWidth as number);

      result.push({
        index: i,
        data: items[i],
        offsetLeft: itemOffsets[i],
        width,
      });
    }

    return result as any;
  }, [
    items,
    scrollLeft,
    containerWidth,
    overscan,
    itemOffsets,
    isDynamicWidth,
    itemWidth,
    itemWidths,
    estimatedItemWidth,
  ]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollLeft(target.scrollLeft);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      setContainerWidth(container.clientWidth);
    }
  }, []);

  const containerProps = useMemo(
    () => ({
      style: {
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
      } as React.CSSProperties,
      onScroll: handleScroll,
      ref: containerRef,
    }),
    [handleScroll]
  );

  const scrollToIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      if (!containerRef.current || index < 0 || index >= items.length) return;

      const itemLeft = itemOffsets[index];
      const itemWidthValue = isDynamicWidth
        ? itemWidths!.widths.get(index) || estimatedItemWidth
        : (itemWidth as number);

      let scrollPosition = itemLeft;

      if (align === 'center') {
        scrollPosition = itemLeft - containerWidth / 2 + itemWidthValue / 2;
      } else if (align === 'end') {
        scrollPosition = itemLeft - containerWidth + itemWidthValue;
      }

      containerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    },
    [itemOffsets, items.length, containerWidth, isDynamicWidth, itemWidths, estimatedItemWidth, itemWidth]
  );

  return {
    virtualItems,
    totalWidth,
    totalHeight: 0,
    containerProps,
    scrollToIndex,
  };
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// Example 1: Lista vertical com altura fixa
function FixedHeightList({ items }: { items: string[] }) {
  const { virtualItems, totalHeight, containerProps } = useVirtualList(items, {
    itemHeight: 50,
    overscan: 3,
  });

  return (
    <div {...containerProps} style={{ ...containerProps.style, height: '400px' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ index, data, offsetTop }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetTop,
              height: 50,
              left: 0,
              right: 0,
            }}
          >
            {data}
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 2: Lista vertical com altura dinâmica
function DynamicHeightList({ items }: { items: { id: string; content: string }[] }) {
  const { virtualItems, totalHeight, containerProps } = useVirtualList(items, {
    itemHeight: (index) => items[index].content.length * 10 + 30,
    estimatedItemHeight: 100,
    overscan: 3,
  });

  return (
    <div {...containerProps} style={{ ...containerProps.style, height: '400px' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ index, data, offsetTop, height }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetTop,
              height,
              left: 0,
              right: 0,
            }}
          >
            {data.content}
          </div>
        ))}
      </div>
    </div>
  );
}
*/
