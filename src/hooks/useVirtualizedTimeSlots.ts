/**
 * useVirtualizedTimeSlots - Hook for virtualizing time slots in calendar views
 * Only renders visible time slots for better performance with large calendars
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualizedTimeSlotsConfig {
  /** Total number of time slots */
  totalSlots: number;
  /** Height of each slot in pixels */
  slotHeight: number;
  /** Number of extra slots to render above/below viewport (overscan) */
  overscan?: number;
  /** Container height in pixels */
  containerHeight: number;
  /** Enable virtualization only when slot count exceeds this threshold */
  threshold?: number;
}

interface VirtualizedTimeSlotsResult {
  /** Visible slot indices to render */
  visibleSlots: number[];
  /** Total height of all slots (for scroll container) */
  totalHeight: number;
  /** Scroll handler to update visible range */
  onScroll: (scrollTop: number) => void;
  /** Whether virtualization is active */
  isVirtualized: boolean;
  /** Offset for positioning visible slots */
  offsetY: number;
}

/**
 * Hook for virtualizing time slots in calendar views
 * Calculates which slots are visible based on scroll position
 * Only activates when slot count exceeds threshold (default: 50)
 */
export function useVirtualizedTimeSlots({
  totalSlots,
  slotHeight,
  overscan = 3,
  containerHeight,
  threshold = 50,
}: VirtualizedTimeSlotsConfig): VirtualizedTimeSlotsResult {
  const [scrollTop, setScrollTop] = useState(0);

  // Determine if virtualization should be active
  const isVirtualized = totalSlots > threshold;

  // Calculate total height
  const totalHeight = totalSlots * slotHeight;

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (!isVirtualized) {
      // If not virtualized, render all slots
      return {
        startIndex: 0,
        endIndex: totalSlots - 1,
        offsetY: 0,
      };
    }

    // Calculate visible range based on scroll position
    const start = Math.floor(scrollTop / slotHeight);
    const visibleCount = Math.ceil(containerHeight / slotHeight);
    const end = start + visibleCount;

    // Apply overscan
    const startWithOverscan = Math.max(0, start - overscan);
    const endWithOverscan = Math.min(totalSlots - 1, end + overscan);

    return {
      startIndex: startWithOverscan,
      endIndex: endWithOverscan,
      offsetY: startWithOverscan * slotHeight,
    };
  }, [scrollTop, slotHeight, containerHeight, totalSlots, overscan, isVirtualized]);

  // Generate array of visible slot indices
  const visibleSlots = useMemo(() => {
    const slots: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      slots.push(i);
    }
    return slots;
  }, [startIndex, endIndex]);

  // Scroll handler
  const onScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  // Reset scroll when total slots change
  useEffect(() => {
    setScrollTop(0);
  }, [totalSlots]);

  return {
    visibleSlots,
    totalHeight,
    onScroll,
    isVirtualized,
    offsetY,
  };
}
