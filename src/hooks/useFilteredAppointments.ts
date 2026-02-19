/**
 * useFilteredAppointments Hook
 * 
 * Provides filtered appointment data with optimized caching strategy.
 * 
 * Features:
 * - Separate cache for filtered results
 * - Debounced patient name search (300ms)
 * - Efficient filtering without blocking UI
 * - Cache restoration when filters are cleared
 * - Compatible with period-based loading
 */

import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppointmentBase } from '@/types/appointment';
import { PeriodQuery } from '@/utils/periodCalculations';
import { useAppointmentsByPeriod, appointmentPeriodKeys } from './useAppointmentsByPeriod';
import { useDebounce } from './use-debounce';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Filter options for appointments
 */
export interface AppointmentFilters {
  /** Filter by appointment status */
  status?: string[];
  /** Filter by appointment type */
  types?: string[];
  /** Filter by therapist ID */
  therapists?: string[];
  /** Filter by patient name (debounced) */
  patientName?: string | null;
}

/**
 * Query key factory for filtered appointment queries
 */
export const filteredAppointmentKeys = {
  all: ['appointments', 'filtered'] as const,
  filtered: (periodQuery: PeriodQuery, filters: AppointmentFilters) => [
    ...filteredAppointmentKeys.all,
    periodQuery.viewType,
    periodQuery.date.getTime(),
    periodQuery.organizationId,
    periodQuery.therapistId || 'none',
    filters.status?.sort().join(',') || 'all',
    filters.types?.sort().join(',') || 'all',
    filters.therapists?.sort().join(',') || 'all',
    filters.patientName || 'all',
  ] as const,
} as const;

/**
 * Check if any filters are active
 */
function hasActiveFilters(filters: AppointmentFilters): boolean {
  return Boolean(
    (filters.status && filters.status.length > 0) ||
    (filters.types && filters.types.length > 0) ||
    (filters.therapists && filters.therapists.length > 0) ||
    (filters.patientName && filters.patientName.trim().length > 0)
  );
}

/**
 * Apply filters to appointments array
 */
function applyFilters(
  appointments: AppointmentBase[],
  filters: AppointmentFilters
): AppointmentBase[] {
  return appointments.filter(apt => {
    // Filter by patient name (case-insensitive partial match)
    if (filters.patientName && filters.patientName.trim().length > 0) {
      const searchTerm = filters.patientName.toLowerCase().trim();
      const patientName = apt.patientName.toLowerCase();
      if (!patientName.includes(searchTerm)) {
        return false;
      }
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(apt.status)) {
        return false;
      }
    }

    // Filter by type
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(apt.type)) {
        return false;
      }
    }

    // Filter by therapist
    if (filters.therapists && filters.therapists.length > 0) {
      if (!apt.therapistId || !filters.therapists.includes(apt.therapistId)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Hook options
 */
export interface UseFilteredAppointmentsOptions {
  /** Enable the query (default: true) */
  enabled?: boolean;
  /** Debounce delay for patient name search in ms (default: 300) */
  debounceDelay?: number;
}

/**
 * Hook to fetch and filter appointments with optimized caching
 * 
 * This hook provides filtered appointment data with:
 * - Separate cache for filtered results
 * - Debounced patient name search
 * - Efficient filtering without blocking UI
 * - Cache restoration when filters are cleared
 * 
 * @param periodQuery - Period query (view type, date, organization)
 * @param filters - Filter options (status, types, therapists, patientName)
 * @param options - Hook options
 * 
 * @example
 * // Basic usage with filters
 * const { data: appointments, isLoading } = useFilteredAppointments(
 *   { viewType: 'week', date: new Date(), organizationId: '123' },
 *   { status: ['agendado'], patientName: 'João' }
 * );
 * 
 * @example
 * // Without filters (returns all appointments from period)
 * const { data: appointments } = useFilteredAppointments(
 *   periodQuery,
 *   {}
 * );
 */
export function useFilteredAppointments(
  periodQuery: PeriodQuery,
  filters: AppointmentFilters = {},
  options: UseFilteredAppointmentsOptions = {}
) {
  const {
    enabled = true,
    debounceDelay = 300,
  } = options;

  // Debounce patient name search to avoid excessive filtering
  const debouncedPatientName = useDebounce(filters.patientName || '', debounceDelay);

  // Create debounced filters object
  const debouncedFilters: AppointmentFilters = useMemo(() => ({
    status: filters.status,
    types: filters.types,
    therapists: filters.therapists,
    patientName: debouncedPatientName || null,
  }), [filters.status, filters.types, filters.therapists, debouncedPatientName]);

  // Check if filters are active
  const filtersActive = hasActiveFilters(debouncedFilters);

  // Log query details for debugging
  useEffect(() => {
    logger.info('useFilteredAppointments query', {
      organizationId: periodQuery.organizationId,
      viewType: periodQuery.viewType,
      date: periodQuery.date.toISOString(),
      filtersActive,
      enabled
    }, 'useFilteredAppointments');
  }, [periodQuery.organizationId, periodQuery.viewType, periodQuery.date, filtersActive, enabled]);

  // Fetch base period data (always enabled to keep cache warm)
  const {
    data: baseAppointments = [],
    isLoading: baseLoading,
    error: baseError,
    refetch: baseRefetch,
  } = useAppointmentsByPeriod(periodQuery, {
    enabled: enabled && !!periodQuery.organizationId,
  });

  // If no filters are active, return base data directly
  // This ensures cache restoration when filters are cleared
  if (!filtersActive) {
    return {
      data: baseAppointments,
      isLoading: baseLoading,
      error: baseError,
      refetch: baseRefetch,
      isFiltered: false,
      filterCount: 0,
      totalCount: baseAppointments.length,
    };
  }

  // Use a separate query for filtered results
  // This allows us to cache filtered results independently
  const filteredQuery = useQuery({
    queryKey: filteredAppointmentKeys.filtered(periodQuery, debouncedFilters),
    queryFn: () => {
      // Apply filters to base data
      return applyFilters(baseAppointments, debouncedFilters);
    },
    enabled: enabled && filtersActive && baseAppointments.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
  });

  return {
    data: filteredQuery.data || [],
    isLoading: baseLoading || (filtersActive && filteredQuery.isLoading),
    error: baseError || filteredQuery.error,
    refetch: async () => {
      await baseRefetch();
      if (filtersActive) {
        await filteredQuery.refetch();
      }
    },
    isFiltered: true,
    filterCount: filteredQuery.data?.length || 0,
    totalCount: baseAppointments.length,
  };
}

/**
 * Helper to check if filters match (for cache comparison)
 */
export function filtersEqual(a: AppointmentFilters, b: AppointmentFilters): boolean {
  return (
    JSON.stringify(a.status?.sort()) === JSON.stringify(b.status?.sort()) &&
    JSON.stringify(a.types?.sort()) === JSON.stringify(b.types?.sort()) &&
    JSON.stringify(a.therapists?.sort()) === JSON.stringify(b.therapists?.sort()) &&
    a.patientName === b.patientName
  );
}
