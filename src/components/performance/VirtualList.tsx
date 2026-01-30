/**
 * Virtual List Component
 *
 * @description
 * Efficient rendering of large lists using windowing technique.
 * Only renders visible items plus a small buffer, dramatically improving
 * performance for lists with 100+ items.
 *
 * @module components/performance/VirtualList
 *
 * @example
 * ```tsx
 * import { VirtualList } from '@/components/performance/VirtualList';
 *
 * function MyComponent() {
 *   const items = Array.from({ length: 1000 }, (_, i) => ({
 *     id: i,
 *     name: `Item ${i}`
 *   }));
 *
 *   return (
 *     <VirtualList
 *       items={items}
 *       itemHeight={60}
 *       height={400}
 *       renderItem={(item) => <div key={item.id}>{item.name}</div>}
 *     />
 *   );
 * }
 * ```
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Fixed height of each item in pixels */
  itemHeight: number;
  /** Height of the viewport/container in pixels */
  height: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  /** Optional key extractor */
  keyExtractor?: (item: T, index: number) => string | number;
  /** Number of extra items to render above/below viewport (buffer) */
  overscan?: number;
  /** Optional class name for the container */
  className?: string;
  /** Optional placeholder while loading */
  placeholder?: React.ReactNode;
  /** Estimated item height for dynamic content (if itemHeight varies) */
  estimatedItemHeight?: number;
}

interface ScrollState {
  scrollTop: number;
  isScrolling: boolean;
}

/**
 * Virtual List Component
 *
 * Uses windowing technique to only render visible items plus buffer.
 * This provides O(1) rendering complexity regardless of list size.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  keyExtractor,
  overscan = 3,
  className,
  placeholder,
  estimatedItemHeight,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollTop: 0,
    isScrolling: false,
  });
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Get default key extractor
  const getDefaultKey = useCallback((item: T, index: number) => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return (item as { id: string | number }).id;
    }
    return index;
  }, []);

  const getKey = keyExtractor || getDefaultKey;

  // Calculate visible range
  const { startIndex, endIndex, visibleCount } = React.useMemo(() => {
    const effectiveItemHeight = estimatedItemHeight || itemHeight;
    const visibleCount = Math.ceil(height / effectiveItemHeight);

    // Add buffer items above and below viewport
    const startIndex = Math.max(
      0,
      Math.floor(scrollState.scrollTop / effectiveItemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollState.scrollTop + height) / effectiveItemHeight) + overscan
    );

    return { startIndex, endIndex, visibleCount };
  }, [scrollState.scrollTop, height, itemHeight, estimatedItemHeight, items.length, overscan]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollState(prev => ({ ...prev, scrollTop }));

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling state
    if (!scrollState.isScrolling) {
      setScrollState(prev => ({ ...prev, isScrolling: true }));
    }

    // Clear scrolling state after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollState(prev => ({ ...prev, isScrolling: false }));
    }, 150);
  }, [scrollState.isScrolling]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
      role="list"
      aria-label={`List with ${items.length} items`}
    >
      {/* Spacer to push items to correct scroll position */}
      <div style={{ height: offsetY }} aria-hidden="true" />

      {/* Visible items */}
      {visibleItems.length > 0 ? (
        visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const key = getKey(item, actualIndex);
          const isVisible = actualIndex >= startIndex - overscan && actualIndex <= endIndex + overscan;

          return (
            <div
              key={key}
              style={{ height: itemHeight }}
              role="listitem"
              aria-setsize={items.length}
              aria-posinset={actualIndex + 1}
            >
              {renderItem(item, actualIndex, isVisible)}
            </div>
          );
        })
      ) : (
        placeholder || <div style={{ height }}>No items to display</div>
      )}

      {/* Spacer for remaining height */}
      <div
        style={{
          height: Math.max(0, totalHeight - offsetY - (visibleItems.length * itemHeight))
        }}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Virtual List with variable item heights
 *
 * For items with dynamic heights, this uses position-based rendering
 * and recalculates positions on scroll.
 */
interface VariableVirtualListProps<T> {
  items: T[];
  estimatedHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  overscan?: number;
  className?: string;
  getItemHeight?: (item: T, index: number) => number;
  placeholder?: React.ReactNode;
}

interface ItemPosition {
  index: number;
  offsetTop: number;
  height: number;
}

/**
 * Variable Height Virtual List
 *
 * Measures item heights dynamically and positions them correctly.
 * Use this when item heights vary significantly.
 */
export function VariableVirtualList<T>({
  items,
  estimatedHeight,
  height,
  renderItem,
  keyExtractor,
  overscan = 3,
  className,
  getItemHeight,
  placeholder,
}: VariableVirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<ItemPosition[]>([]);
  const [scrollTop, setScrollTop] = useState(0);

  // Initialize positions
  useEffect(() => {
    let offset = 0;
    const newPositions = items.map((_, index) => {
      const pos = { index, offsetTop: offset, height: estimatedHeight };
      offset += estimatedHeight;
      return pos;
    });
    setPositions(newPositions);
  }, [items, estimatedHeight]);

  // Update positions after measuring
  const updatePositions = useCallback(() => {
    const newPositionMap = new Map<number, ItemPosition>();

    let offset = 0;
    for (let i = 0; i < items.length; i++) {
      const measuredHeight = getItemHeight
        ? getItemHeight(items[i], i)
        : positions[i]?.height || estimatedHeight;

      newPositionMap.set(i, { index: i, offsetTop: offset, height: measuredHeight });
      offset += measuredHeight;
    }

    setPositions(Array.from(newPositionMap.values()));
  }, [items, positions, estimatedHeight, getItemHeight]);

  // Measure items after render
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      updatePositions();
    });

    itemRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [updatePositions]);

  const totalHeight = positions.length > 0
    ? positions[positions.length - 1].offsetTop + positions[positions.length - 1].height
    : 0;

  const getDefaultKey = useCallback((item: T, index: number) => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return (item as { id: string | number }).id;
    }
    return index;
  }, []);

  const getKey = keyExtractor || getDefaultKey;

  // Calculate visible range
  const { startIndex, endIndex } = React.useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / estimatedHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + height) / estimatedHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, height, estimatedHeight, items.length, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      {positions.length > 0 && (
        <>
          {/* Top spacer */}
          {startIndex > 0 && (
            <div style={{ height: positions[startIndex]?.offsetTop || 0 }} />
          )}

          {/* Visible items */}
          {items.slice(startIndex, endIndex + 1).map((item, i) => {
            const actualIndex = startIndex + i;
            const pos = positions[actualIndex];
            const key = getKey(item, actualIndex);

            return (
              <div
                key={key}
                ref={(el) => {
                  if (el) itemRefs.current.set(actualIndex, el);
                }}
                style={{
                  position: 'absolute',
                  top: pos?.offsetTop || 0,
                  width: '100%',
                  minHeight: estimatedHeight,
                }}
                role="listitem"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}

          {/* Bottom spacer */}
          {endIndex < items.length - 1 && (
            <div
              style={{
                height: Math.max(
                  0,
                  totalHeight - (positions[endIndex]?.offsetTop || 0) - (positions[endIndex]?.height || 0)
                ),
              }}
            />
          )}
        </>
      )}

      {(positions.length === 0 || items.length === 0) && (
        <div style={{ height }} className="flex items-center justify-center">
          {placeholder || 'No items'}
        </div>
      )}
    </div>
  );
}

export default VirtualList;
