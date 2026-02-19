/**
 * Cache Invalidation Utilities
 * 
 * Provides selective cache invalidation for appointment data.
 * Instead of invalidating all appointment caches, only invalidates
 * the specific periods that contain the affected appointment.
 * 
 * This improves performance by:
 * - Avoiding unnecessary refetches of unaffected periods
 * - Preserving cache for periods that haven't changed
 * - Reducing server load and network traffic
 */

import { QueryClient } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { ViewType, calculatePeriodBounds, isDateInPeriod } from './periodCalculations';
import { appointmentPeriodKeys } from '@/hooks/useAppointmentsByPeriod';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Invalidates only the cache entries that contain the specified appointment date.
 * 
 * This function:
 * 1. Parses the appointment date
 * 2. Checks all cached period queries
 * 3. Invalidates only those periods that contain the appointment date
 * 
 * @param appointmentDate - ISO date string (YYYY-MM-DD)
 * @param queryClient - TanStack Query client instance
 * @param organizationId - Organization ID to scope the invalidation
 * 
 * @example
 * // After creating/updating/deleting an appointment on 2024-01-15
 * await invalidateAffectedPeriods('2024-01-15', queryClient, 'org-123');
 * 
 * // This will invalidate:
 * // - Day view for 2024-01-15
 * // - Week view for week containing 2024-01-15
 * // - Month view for January 2024
 * // But NOT other periods (e.g., February 2024, previous week, etc.)
 */
export async function invalidateAffectedPeriods(
  appointmentDate: string,
  queryClient: QueryClient,
  organizationId: string
): Promise<void> {
  try {
    const date = parseISO(appointmentDate);
    
    if (isNaN(date.getTime())) {
      logger.warn('Invalid appointment date for cache invalidation', { appointmentDate });
      // Fallback to invalidating all periods
      await queryClient.invalidateQueries({
        queryKey: appointmentPeriodKeys.all,
      });
      return;
    }

    logger.debug('Invalidating affected periods', {
      appointmentDate,
      organizationId,
    });

    // Invalidate all view types that contain this date
    const viewTypes: ViewType[] = ['day', 'week', 'month'];
    
    for (const viewType of viewTypes) {
      const bounds = calculatePeriodBounds({
        viewType,
        date,
        organizationId,
      });

      // Check if the appointment date falls within this period
      if (isDateInPeriod(date, bounds)) {
        // Invalidate this specific period
        await queryClient.invalidateQueries({
          queryKey: appointmentPeriodKeys.period({
            viewType,
            date,
            organizationId,
          }),
        });

        logger.debug('Invalidated period cache', {
          viewType,
          appointmentDate,
        });
      }
    }

    logger.info('Selective cache invalidation completed', {
      appointmentDate,
      viewTypesInvalidated: viewTypes.length,
    });
  } catch (error) {
    logger.error('Error during selective cache invalidation', error);
    // Fallback to invalidating all periods
    await queryClient.invalidateQueries({
      queryKey: appointmentPeriodKeys.all,
    });
  }
}

/**
 * Invalidates cache for a date range.
 * Useful when bulk operations affect multiple dates.
 * 
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @param queryClient - TanStack Query client instance
 * @param organizationId - Organization ID
 * 
 * @example
 * // After bulk deleting appointments from Jan 1-15
 * await invalidateDateRange('2024-01-01', '2024-01-15', queryClient, 'org-123');
 */
export async function invalidateDateRange(
  startDate: string,
  endDate: string,
  queryClient: QueryClient,
  organizationId: string
): Promise<void> {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      logger.warn('Invalid date range for cache invalidation', { startDate, endDate });
      await queryClient.invalidateQueries({
        queryKey: appointmentPeriodKeys.all,
      });
      return;
    }

    logger.debug('Invalidating date range', {
      startDate,
      endDate,
      organizationId,
    });

    // For date ranges, it's more efficient to invalidate all periods
    // that might overlap with the range
    await queryClient.invalidateQueries({
      queryKey: appointmentPeriodKeys.all,
      predicate: (query) => {
        // Check if query key matches our organization
        const queryKey = query.queryKey as any[];
        if (queryKey[0] !== 'appointments' || queryKey[1] !== 'period') {
          return false;
        }

        // Check organization ID
        const queryOrgId = queryKey[4];
        if (queryOrgId !== organizationId) {
          return false;
        }

        // Check if period overlaps with date range
        const periodStart = parseISO(queryKey[2]);
        const periodEnd = parseISO(queryKey[3]);

        // Periods overlap if:
        // - Period start is before range end AND
        // - Period end is after range start
        const overlaps = periodStart <= end && periodEnd >= start;

        return overlaps;
      },
    });

    logger.info('Date range cache invalidation completed', {
      startDate,
      endDate,
    });
  } catch (error) {
    logger.error('Error during date range cache invalidation', error);
    await queryClient.invalidateQueries({
      queryKey: appointmentPeriodKeys.all,
    });
  }
}

/**
 * Invalidates all appointment caches for an organization.
 * Use this as a fallback or when you need to force a complete refresh.
 * 
 * @param queryClient - TanStack Query client instance
 * @param organizationId - Optional organization ID to scope the invalidation
 * 
 * @example
 * // Force refresh all appointment data
 * await invalidateAllAppointmentCaches(queryClient, 'org-123');
 */
export async function invalidateAllAppointmentCaches(
  queryClient: QueryClient,
  organizationId?: string
): Promise<void> {
  logger.info('Invalidating all appointment caches', { organizationId });

  if (organizationId) {
    // Invalidate only for specific organization
    await queryClient.invalidateQueries({
      queryKey: appointmentPeriodKeys.all,
      predicate: (query) => {
        const queryKey = query.queryKey as any[];
        return queryKey[4] === organizationId;
      },
    });
  } else {
    // Invalidate all appointment caches
    await queryClient.invalidateQueries({
      queryKey: appointmentPeriodKeys.all,
    });
  }
}
