/**
 * useFilteredAppointments Hook
 *
 * Provides filtered appointment data with optimized performance.
 *
 * Features:
 * - Reactive filtering using useMemo for instant UI updates
 * - Debounced patient name search (300ms)
 * - Efficient filtering without blocking UI
 * - Compatible with period-based loading
 */

import { useMemo, useEffect } from "react";
import { AppointmentBase } from "@/types/appointment";
import { PeriodQuery } from "@/utils/periodCalculations";
import { useAppointmentsByPeriod } from "./useAppointmentsByPeriod";
import { useDebounce } from "./use-debounce";
import { fisioLogger as logger } from "@/lib/errors/logger";

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
 * Check if any filters are active
 */
function hasActiveFilters(filters: AppointmentFilters): boolean {
	return Boolean(
		(filters.status && filters.status.length > 0) ||
			(filters.types && filters.types.length > 0) ||
			(filters.therapists && filters.therapists.length > 0) ||
			(filters.patientName && filters.patientName.trim().length > 0),
	);
}

/**
 * Apply filters to appointments array
 */
function applyFilters(
	appointments: AppointmentBase[],
	filters: AppointmentFilters,
): AppointmentBase[] {
	if (!appointments || appointments.length === 0) return [];

	return appointments.filter((apt) => {
		// Filter by patient name (case-insensitive partial match)
		if (filters.patientName && filters.patientName.trim().length > 0) {
			const searchTerm = filters.patientName.toLowerCase().trim();
			const patientName = (apt.patientName || "").toLowerCase();
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
 * Hook to fetch and filter appointments with optimized performance
 *
 * This hook provides filtered appointment data with:
 * - Instant updates via useMemo when base data changes
 * - Debounced patient name search
 * - Support for period-based loading
 *
 * @param periodQuery - Period query (view type, date, organization)
 * @param filters - Filter options (status, types, therapists, patientName)
 * @param options - Hook options
 */
export function useFilteredAppointments(
	periodQuery: PeriodQuery,
	filters: AppointmentFilters = {},
	options: UseFilteredAppointmentsOptions = {},
) {
	const { enabled = true, debounceDelay = 300 } = options;

	// Debounce patient name search to avoid excessive filtering
	const debouncedPatientName = useDebounce(
		filters.patientName || "",
		debounceDelay,
	);

	// Create debounced filters object
	const debouncedFilters: AppointmentFilters = useMemo(
		() => ({
			status: filters.status,
			types: filters.types,
			therapists: filters.therapists,
			patientName: debouncedPatientName || null,
		}),
		[filters.status, filters.types, filters.therapists, debouncedPatientName],
	);

	// Check if filters are active
	const filtersActive = hasActiveFilters(debouncedFilters);

	// Fetch base period data (always enabled to keep cache warm)
	const appointmentsByPeriod = useAppointmentsByPeriod(periodQuery, {
		enabled: enabled && !!periodQuery.organizationId,
	});

	const {
		data: baseAppointments = [],
		isLoading: baseLoading,
		error: baseError,
		refetch: baseRefetch,
	} = appointmentsByPeriod;

	// Filter appointments in memory for maximum responsiveness
	// This is better than useQuery for filtering because it reacts instantly to
	// optimistic updates in the baseAppointments cache.
	const filteredAppointments = useMemo(() => {
		if (!filtersActive) return baseAppointments;
		return applyFilters(baseAppointments, debouncedFilters);
	}, [baseAppointments, debouncedFilters, filtersActive]);

	// Log query details for debugging
	useEffect(() => {
		if (filtersActive) {
			logger.debug(
				"Appointments filtered locally",
				{
					originalCount: baseAppointments.length,
					filteredCount: filteredAppointments.length,
					filters: debouncedFilters,
				},
				"useFilteredAppointments",
			);
		}
	}, [
		filtersActive,
		baseAppointments.length,
		filteredAppointments.length,
		debouncedFilters,
	]);

	return {
		data: filteredAppointments,
		isLoading: baseLoading,
		error: baseError,
		refetch: baseRefetch,
		isFiltered: filtersActive,
		filterCount: filteredAppointments.length,
		totalCount: baseAppointments.length,
	};
}

/**
 * Helper to check if filters match (for cache comparison)
 */
export function filtersEqual(
	a: AppointmentFilters,
	b: AppointmentFilters,
): boolean {
	return (
		JSON.stringify(a.status?.sort()) === JSON.stringify(b.status?.sort()) &&
		JSON.stringify(a.types?.sort()) === JSON.stringify(b.types?.sort()) &&
		JSON.stringify(a.therapists?.sort()) ===
			JSON.stringify(b.therapists?.sort()) &&
		a.patientName === b.patientName
	);
}
