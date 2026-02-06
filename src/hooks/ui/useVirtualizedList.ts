import { useCallback, useState } from 'react';

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
