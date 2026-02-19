/**
 * VirtualizedCalendarGrid - Virtualized time slot rendering for calendar views
 * 
 * This component uses the useVirtualizedTimeSlots hook to render only visible
 * time slots for improved performance with large calendars (>50 slots).
 * 
 * Features:
 * - Only renders visible time slots (plus overscan buffer)
 * - Uses transform: translateY() for optimal performance
 * - Automatically enables virtualization when slot count > 50
 * - Maintains smooth scrolling at 60fps
 * 
 * Validates Requirements 2.1, 2.2
 */

import React, { useRef, useCallback, ReactNode } from 'react';
import { useVirtualizedTimeSlots } from '@/hooks/useVirtualizedTimeSlots';

interface VirtualizedCalendarGridProps {
  /** Array of time slot strings (e.g., ["08:00", "08:30", "09:00"]) */
  timeSlots: string[];
  /** Height of each time slot in pixels */
  slotHeight: number;
  /** Container height in pixels (viewport height) */
  containerHeight: number;
  /** Number of extra slots to render above/below viewport (default: 3) */
  overscan?: number;
  /** Render function for each time slot */
  renderSlot: (time: string, index: number) => ReactNode;
  /** Optional className for the container */
  className?: string;
  /** Optional callback when scroll position changes */
  onScrollChange?: (scrollTop: number) => void;
}

/**
 * VirtualizedCalendarGrid component
 * 
 * Renders a virtualized grid of time slots for optimal performance.
 * Only applies virtualization when slot count exceeds 50 slots.
 */
export const VirtualizedCalendarGrid: React.FC<VirtualizedCalendarGridProps> = ({
  timeSlots,
  slotHeight,
  containerHeight,
  overscan = 3,
  renderSlot,
  className = '',
  onScrollChange,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use virtualization hook
  const {
    visibleSlots,
    totalHeight,
    onScroll,
    isVirtualized,
    offsetY,
  } = useVirtualizedTimeSlots({
    totalSlots: timeSlots.length,
    slotHeight,
    overscan,
    containerHeight,
    threshold: 50, // Only virtualize when > 50 slots
  });

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      onScroll(scrollTop);
      onScrollChange?.(scrollTop);
    },
    [onScroll, onScrollChange]
  );

  // If not virtualized, render all slots normally
  if (!isVirtualized) {
    return (
      <div
        ref={scrollContainerRef}
        className={className}
        onScroll={handleScroll}
        style={{
          overflowY: 'auto',
          height: containerHeight,
        }}
      >
        <div style={{ height: totalHeight }}>
          {timeSlots.map((time, index) => (
            <div key={time}>{renderSlot(time, index)}</div>
          ))}
        </div>
      </div>
    );
  }

  // Virtualized rendering
  return (
    <div
      ref={scrollContainerRef}
      className={className}
      onScroll={handleScroll}
      style={{
        overflowY: 'auto',
        height: containerHeight,
        position: 'relative',
      }}
    >
      {/* Spacer to maintain total scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible slots container with transform for performance */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
            willChange: 'transform',
          }}
        >
          {visibleSlots.map((slotIndex) => {
            const time = timeSlots[slotIndex];
            return (
              <div key={`${time}-${slotIndex}`}>
                {renderSlot(time, slotIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

VirtualizedCalendarGrid.displayName = 'VirtualizedCalendarGrid';
