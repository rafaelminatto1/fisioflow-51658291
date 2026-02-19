/**
 * usePrefetchAdjacentPeriods Hook
 * 
 * Prefetches appointments for adjacent periods (next/previous) to enable
 * instant navigation between periods.
 * 
 * Features:
 * - Prefetches next and previous periods after 500ms delay
 * - Network-aware prefetching (respects slow connections)
 * - Silent prefetch (no loading indicators)
 * - Configurable direction (forward/backward/both)
 * - Uses TanStack Query's prefetchQuery
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PeriodQuery, calculateAdjacentPeriod } from '@/utils/periodCalculations';
import { appointmentPeriodKeys } from '@/hooks/useAppointmentsByPeriod';
import { AppointmentService } from '@/services/appointmentService';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { calculatePeriodBounds } from '@/utils/periodCalculations';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Prefetch direction options
 */
export type PrefetchDirection = 'forward' | 'backward' | 'both';

/**
 * Hook options
 */
export interface UsePrefetchAdjacentPeriodsOptions {
  /** Direction to prefetch (default: 'both') */
  direction?: PrefetchDirection;
  /** Delay before prefetching in ms (default: 500) */
  delay?: number;
  /** Enable network-aware prefetching (default: true) */
  networkAware?: boolean;
  /** Disable prefetching entirely (default: false) */
  disabled?: boolean;
}

/**
 * Check if network is slow (3G or slower)
 */
function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const connection = (navigator as any).connection;
  if (!connection) return false;

  // Check effective type (4g, 3g, 2g, slow-2g)
  const effectiveType = connection.effectiveType;
  if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    return true;
  }

  // Check if save-data is enabled
  if (connection.saveData) {
    return true;
  }

  return false;
}

/**
 * Fetch appointments for a period (used by prefetch)
 */
async function fetchPeriodAppointments(query: PeriodQuery) {
  const bounds = calculatePeriodBounds(query);
  
  const appointments = await AppointmentService.fetchAppointments(
    query.organizationId,
    {
      dateFrom: formatDateToLocalISO(bounds.startDate),
      dateTo: formatDateToLocalISO(bounds.endDate),
    }
  );

  // Filter by therapist if specified
  return query.therapistId
    ? appointments.filter(apt => apt.therapistId === query.therapistId)
    : appointments;
}

/**
 * Hook to prefetch appointments for adjacent periods
 * 
 * This hook silently prefetches data for the next and/or previous period
 * to enable instant navigation. Prefetching happens after a delay and
 * respects network conditions.
 * 
 * @param query - Current period query
 * @param options - Prefetch options
 * 
 * @example
 * // Prefetch both next and previous periods
 * usePrefetchAdjacentPeriods({
 *   viewType: 'week',
 *   date: currentDate,
 *   organizationId: '123',
 * });
 * 
 * @example
 * // Prefetch only forward (next period)
 * usePrefetchAdjacentPeriods(query, {
 *   direction: 'forward',
 *   delay: 1000,
 * });
 * 
 * @example
 * // Disable on slow networks
 * usePrefetchAdjacentPeriods(query, {
 *   networkAware: true,
 * });
 */
export function usePrefetchAdjacentPeriods(
  query: PeriodQuery,
  options: UsePrefetchAdjacentPeriodsOptions = {}
) {
  const {
    direction = 'both',
    delay = 500,
    networkAware = true,
    disabled = false,
  } = options;

  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Don't prefetch if disabled or no organization ID
    if (disabled || !query.organizationId) {
      return;
    }

    // Don't prefetch on slow networks if network-aware is enabled
    if (networkAware && isSlowNetwork()) {
      logger.info('Skipping prefetch on slow network', {
        viewType: query.viewType,
      });
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule prefetch after delay
    timeoutRef.current = setTimeout(() => {
      const shouldPrefetchNext = direction === 'forward' || direction === 'both';
      const shouldPrefetchPrev = direction === 'backward' || direction === 'both';

      // Prefetch next period
      if (shouldPrefetchNext) {
        const nextQuery = calculateAdjacentPeriod(query, 'forward');
        const nextQueryKey = appointmentPeriodKeys.period(nextQuery);

        queryClient.prefetchQuery({
          queryKey: nextQueryKey,
          queryFn: () => fetchPeriodAppointments(nextQuery),
          staleTime: 5 * 60 * 1000, // 5 minutes
        });

        logger.debug('Prefetching next period', {
          viewType: query.viewType,
          direction: 'forward',
        });
      }

      // Prefetch previous period
      if (shouldPrefetchPrev) {
        const prevQuery = calculateAdjacentPeriod(query, 'backward');
        const prevQueryKey = appointmentPeriodKeys.period(prevQuery);

        queryClient.prefetchQuery({
          queryKey: prevQueryKey,
          queryFn: () => fetchPeriodAppointments(prevQuery),
          staleTime: 5 * 60 * 1000, // 5 minutes
        });

        logger.debug('Prefetching previous period', {
          viewType: query.viewType,
          direction: 'backward',
        });
      }
    }, delay);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    query.viewType,
    query.date.getTime(), // Use timestamp to detect date changes
    query.organizationId,
    query.therapistId,
    direction,
    delay,
    networkAware,
    disabled,
    queryClient,
  ]);
}
