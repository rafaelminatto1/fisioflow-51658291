import React, { useMemo, useRef, useState, useCallback } from 'react';
import { AppointmentCard } from '../AppointmentCard';
import type { Appointment } from '@/types/appointment';

interface VirtualizedAppointmentListProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  itemHeight?: number;
  overscan?: number;
  className?: string;
}

/**
 * VirtualizedAppointmentList - Renders only visible appointment cards
 * 
 * Uses custom virtualization to render only appointments visible in the viewport
 * plus an overscan buffer. This improves performance when displaying large lists
 * of appointments (50+).
 * 
 * **Validates: Requirement 2.3**
 */
export function VirtualizedAppointmentList({
  appointments,
  onAppointmentClick,
  itemHeight = 200, // Approximate height of AppointmentCard in expanded mode
  overscan = 3,
  className = ''
}: VirtualizedAppointmentListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Only apply virtualization if we have many appointments
  const shouldVirtualize = appointments.length > 50;

  // Calculate visible range based on scroll position
  const { visibleStart, visibleEnd, totalHeight } = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        visibleStart: 0,
        visibleEnd: appointments.length,
        totalHeight: appointments.length * itemHeight
      };
    }

    const containerHeight = containerRef.current?.clientHeight || 600;
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight);

    return {
      visibleStart: Math.max(0, start - overscan),
      visibleEnd: Math.min(appointments.length, end + overscan),
      totalHeight: appointments.length * itemHeight
    };
  }, [scrollTop, itemHeight, overscan, appointments.length, shouldVirtualize]);

  // Get visible appointments
  const visibleAppointments = useMemo(() => {
    return appointments.slice(visibleStart, visibleEnd);
  }, [appointments, visibleStart, visibleEnd]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  // Memoize click handler to prevent re-renders
  const handleClick = useCallback((appointment: Appointment) => {
    onAppointmentClick(appointment);
  }, [onAppointmentClick]);

  // Non-virtualized rendering for small lists
  if (!shouldVirtualize) {
    return (
      <div className={`space-y-3 ${className}`}>
        {appointments.map(appointment => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onClick={() => handleClick(appointment)}
            variant="expanded"
          />
        ))}
      </div>
    );
  }

  // Virtualized rendering for large lists
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ height: '100%' }}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleAppointments.map((appointment, index) => {
          const absoluteIndex = visibleStart + index;
          const offsetY = absoluteIndex * itemHeight;

          return (
            <div
              key={appointment.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${offsetY}px)`,
                height: itemHeight
              }}
            >
              <div className="px-4 pb-3">
                <AppointmentCard
                  appointment={appointment}
                  onClick={() => handleClick(appointment)}
                  variant="expanded"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
