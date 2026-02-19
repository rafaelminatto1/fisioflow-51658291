/**
 * useAppointmentsByPeriod Hook
 * 
 * Fetches appointments for a specific time period (day, week, or month)
 * instead of loading all appointments at once.
 * 
 * Features:
 * - Period-based data loading (only fetch visible appointments)
 * - TanStack Query caching with 5-minute stale time
 * - Separate cache entries per period for efficient navigation
 * - Compatible with existing appointment infrastructure
 */

import { useQuery } from '@tanstack/react-query';
import { AppointmentBase } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { AppointmentService } from '@/services/appointmentService';
import { 
  PeriodQuery, 
  calculatePeriodBounds,
  formatPeriodBounds 
} from '@/utils/periodCalculations';
import { formatDateToLocalISO } from '@/utils/dateUtils';

/**
 * Query key factory for period-based appointment queries
 */
export const appointmentPeriodKeys = {
  all: ['appointments', 'period'] as const,
  period: (query: PeriodQuery) => {
    const bounds = calculatePeriodBounds(query);
    return [
      ...appointmentPeriodKeys.all,
      query.viewType,
      formatDateToLocalISO(bounds.startDate),
      formatDateToLocalISO(bounds.endDate),
      query.organizationId,
      query.therapistId,
    ] as const;
  },
} as const;

/**
 * Fetch appointments for a specific period
 */
async function fetchAppointmentsByPeriod(query: PeriodQuery): Promise<AppointmentBase[]> {
  const timer = logger.startTimer('fetchAppointmentsByPeriod');
  const bounds = calculatePeriodBounds(query);
  
  logger.info('Fetching appointments for period', {
    viewType: query.viewType,
    period: formatPeriodBounds(bounds),
  }, 'useAppointmentsByPeriod');

  try {
    // Use AppointmentService with date range filtering
    const appointments = await AppointmentService.fetchAppointments(
      query.organizationId,
      {
        dateFrom: formatDateToLocalISO(bounds.startDate),
        dateTo: formatDateToLocalISO(bounds.endDate),
      }
    );

    // Filter by therapist if specified
    const filtered = query.therapistId
      ? appointments.filter(apt => apt.therapistId === query.therapistId)
      : appointments;

    logger.info('Period appointments fetched', {
      count: filtered.length,
      viewType: query.viewType,
      period: formatPeriodBounds(bounds),
    }, 'useAppointmentsByPeriod');

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'src/hooks/useAppointmentsByPeriod.ts:70',
        message: 'Period appointments fetched',
        data: {
          viewType: query.viewType,
          period: formatPeriodBounds(bounds),
          count: filtered.length,
        },
        runId: 'agenda-debug',
        hypothesisId: 'H1',
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    timer();
    return filtered;
  } catch (error) {
    logger.error('Failed to fetch period appointments', error, 'useAppointmentsByPeriod');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'src/hooks/useAppointmentsByPeriod.ts:79',
        message: 'Failed to fetch period appointments',
        data: {
          viewType: query.viewType,
          period: formatPeriodBounds(bounds),
        },
        runId: 'agenda-debug',
        hypothesisId: 'H1',
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    timer();
    throw error;
  }
}

/**
 * Hook options
 */
export interface UseAppointmentsByPeriodOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

/**
 * Hook to fetch appointments for a specific time period
 * 
 * @param query - Period query with view type, date, and organization ID
 * @param options - Query options (enabled, staleTime, cacheTime)
 * 
 * @example
 * // Fetch appointments for current week
 * const { data: appointments, isLoading } = useAppointmentsByPeriod({
 *   viewType: 'week',
 *   date: new Date(),
 *   organizationId: '123',
 * });
 * 
 * @example
 * // Fetch appointments for specific day with therapist filter
 * const { data: appointments } = useAppointmentsByPeriod({
 *   viewType: 'day',
 *   date: new Date('2024-01-15'),
 *   organizationId: '123',
 *   therapistId: 'therapist-456',
 * });
 */
export function useAppointmentsByPeriod(
  query: PeriodQuery,
  options: UseAppointmentsByPeriodOptions = {}
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes (gcTime in newer versions)
  } = options;

  const shouldEnable = enabled && !!query.organizationId;

  return useQuery({
    queryKey: appointmentPeriodKeys.period(query),
    queryFn: () => fetchAppointmentsByPeriod(query),
    staleTime,
    gcTime: cacheTime, // TanStack Query v5 uses gcTime instead of cacheTime
    enabled: shouldEnable,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}

/**
 * Helper to invalidate all period caches
 * Useful after creating, updating, or deleting appointments
 */
export function invalidateAllPeriodCaches(queryClient: any) {
  return queryClient.invalidateQueries({
    queryKey: appointmentPeriodKeys.all,
  });
}

/**
 * Helper to invalidate specific period cache
 * More efficient than invalidating all caches
 */
export function invalidatePeriodCache(queryClient: any, query: PeriodQuery) {
  return queryClient.invalidateQueries({
    queryKey: appointmentPeriodKeys.period(query),
  });
}
