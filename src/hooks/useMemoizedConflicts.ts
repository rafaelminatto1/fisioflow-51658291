/**
 * useMemoizedConflicts - Memoized conflict detection hook
 * Caches conflict detection results to avoid repeated calculations
 */

import { useMemo } from 'react';
import type { Appointment } from '@/types/appointment';

interface TimeSlot {
  date: Date;
  time: string;
}

interface ConflictResult {
  hasConflict: boolean;
  conflictingAppointments: Appointment[];
}

/**
 * Parse time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Format date to YYYY-MM-DD for comparison
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Hook for memoized conflict detection
 * Checks if a time slot conflicts with existing appointments
 * 
 * @param slot - Time slot to check
 * @param duration - Duration in minutes
 * @param appointments - List of existing appointments
 * @param excludeId - Optional appointment ID to exclude from conflict check
 * @returns Conflict detection result
 */
export function useMemoizedConflicts(
  slot: TimeSlot | null,
  duration: number,
  appointments: Appointment[],
  excludeId?: string
): ConflictResult {
  return useMemo(() => {
    if (!slot) {
      return { hasConflict: false, conflictingAppointments: [] };
    }

    const slotDateKey = formatDateKey(slot.date);
    const slotStart = timeToMinutes(slot.time);
    const slotEnd = slotStart + duration;

    const conflicting = appointments.filter(apt => {
      // Skip excluded appointment
      if (excludeId && apt.id === excludeId) {
        return false;
      }

      // Skip cancelled appointments
      if (apt.status === 'cancelado' || apt.status === 'falta') {
        return false;
      }

      // Check if same date
      const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
      const aptDateKey = formatDateKey(aptDate);
      
      if (aptDateKey !== slotDateKey) {
        return false;
      }

      // Check time overlap
      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + (apt.duration || 60);

      return timeRangesOverlap(slotStart, slotEnd, aptStart, aptEnd);
    });

    return {
      hasConflict: conflicting.length > 0,
      conflictingAppointments: conflicting,
    };
  }, [
    slot?.date.getTime(),
    slot?.time,
    duration,
    appointments.length,
    appointments.map(a => `${a.id}-${a.time}-${a.duration}`).join(','),
    excludeId,
  ]);
}

/**
 * Hook for checking multiple time slots for conflicts
 * Useful when checking availability for multiple slots at once
 * 
 * @param slots - Array of time slots to check
 * @param duration - Duration in minutes
 * @param appointments - List of existing appointments
 * @returns Map of slot index to conflict result
 */
export function useMemoizedMultipleConflicts(
  slots: TimeSlot[],
  duration: number,
  appointments: Appointment[]
): Map<number, ConflictResult> {
  return useMemo(() => {
    const results = new Map<number, ConflictResult>();

    slots.forEach((slot, index) => {
      const slotDateKey = formatDateKey(slot.date);
      const slotStart = timeToMinutes(slot.time);
      const slotEnd = slotStart + duration;

      const conflicting = appointments.filter(apt => {
        if (apt.status === 'cancelado' || apt.status === 'falta') {
          return false;
        }

        const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
        const aptDateKey = formatDateKey(aptDate);
        
        if (aptDateKey !== slotDateKey) {
          return false;
        }

        const aptStart = timeToMinutes(apt.time);
        const aptEnd = aptStart + (apt.duration || 60);

        return timeRangesOverlap(slotStart, slotEnd, aptStart, aptEnd);
      });

      results.set(index, {
        hasConflict: conflicting.length > 0,
        conflictingAppointments: conflicting,
      });
    });

    return results;
  }, [
    slots.map(s => `${s.date.getTime()}-${s.time}`).join(','),
    duration,
    appointments.length,
    appointments.map(a => `${a.id}-${a.time}-${a.duration}`).join(','),
  ]);
}
