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

import { useQuery } from "@tanstack/react-query";
import { AppointmentBase } from "@/types/appointment";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { AppointmentService } from "@/services/appointmentService";
import { appointmentsCacheService } from "@/lib/offline/AppointmentsCacheService";
import {
	PeriodQuery,
	calculatePeriodBounds,
	formatPeriodBounds,
} from "@/utils/periodCalculations";
import { formatDateToLocalISO } from "@/utils/dateUtils";

/**
 * Query key factory for period-based appointment queries
 */
export const appointmentPeriodKeys = {
	all: ["appointments", "period"] as const,
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
 * Fetch appointments for a specific period with Offline Fallback
 */
async function fetchAppointmentsByPeriod(
	query: PeriodQuery,
): Promise<AppointmentBase[]> {
	const timer = logger.startTimer("fetchAppointmentsByPeriod");
	const bounds = calculatePeriodBounds(query);
	const dateFrom = formatDateToLocalISO(bounds.startDate);
	const dateTo = formatDateToLocalISO(bounds.endDate);

	logger.info(
		"Fetching appointments for period",
		{
			viewType: query.viewType,
			period: formatPeriodBounds(bounds),
		},
		"useAppointmentsByPeriod",
	);

	try {
		// 1. Try to fetch from API (Cloudflare/Neon)
		const appointments = await AppointmentService.fetchAppointments(
			query.organizationId,
			{ dateFrom, dateTo },
		);

		// Filter by therapist if specified
		const filtered = query.therapistId
			? appointments.filter((apt) => apt.therapistId === query.therapistId)
			: appointments;

		// 2. SUCCESS: Save to local persistent cache for offline use
		// We save the results so they are available next time even without internet
		try {
			await appointmentsCacheService.saveAppointments(filtered);
			logger.debug(
				"Period appointments persisted to local storage",
				{ count: filtered.length },
				"useAppointmentsByPeriod",
			);
		} catch (cacheErr) {
			logger.warn(
				"Failed to persist appointments to local cache",
				cacheErr,
				"useAppointmentsByPeriod",
			);
		}

		timer();
		return filtered;
	} catch (error) {
		// 3. OFFLINE FALLBACK: If network fails, try to recover from local cache
		logger.warn(
			"Network fetch failed, attempting local cache recovery",
			{ error },
			"useAppointmentsByPeriod",
		);

		try {
			// Try to get from local persistent storage (IndexedDB)
			const cachedAppointments = await appointmentsCacheService.getAppointments(
				query.organizationId,
			);

			// Filter the cached ones for this specific period in memory
			const periodAppointments = cachedAppointments.filter((apt) => {
				const aptDate = formatDateToLocalISO(apt.date);
				return aptDate >= dateFrom && aptDate <= dateTo;
			});

			// Filter by therapist if specified
			const finalResults = query.therapistId
				? periodAppointments.filter(
						(apt) => apt.therapistId === query.therapistId,
					)
				: periodAppointments;

			if (finalResults.length > 0) {
				logger.info(
					"Recovered appointments from local cache",
					{ count: finalResults.length },
					"useAppointmentsByPeriod",
				);
				timer();
				return finalResults;
			}
		} catch (cacheErr) {
			logger.error(
				"Final fallback to local cache failed",
				cacheErr,
				"useAppointmentsByPeriod",
			);
		}

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
	options: UseAppointmentsByPeriodOptions = {},
) {
	const {
		enabled = true,
		staleTime = 15 * 60 * 1000, // 15 minutes — agendamentos do período raramente mudam
		cacheTime = 30 * 60 * 1000, // 30 minutes
	} = options;

	const shouldEnable = enabled && !!query.organizationId;

	return useQuery({
		queryKey: appointmentPeriodKeys.period(query),
		queryFn: () => fetchAppointmentsByPeriod(query),
		staleTime,
		gcTime: cacheTime, // TanStack Query v5 uses gcTime instead of cacheTime
		enabled: shouldEnable,
		retry: 3, // Increased retries for network resilience
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		refetchInterval: 60 * 1000, // 1 minute intelligent polling (Cloudflare friendly)
		refetchIntervalInBackground: false, // Don't burn resources in background
		placeholderData: (previousData) => previousData, // Keep previous data while refetching
		networkMode: "offlineFirst", // CRITICAL: Use cache even if navigator.onLine is false
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
