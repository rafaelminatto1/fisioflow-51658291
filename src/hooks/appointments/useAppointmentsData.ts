/**
 * useAppointmentsData — TanStack Query para busca de agendamentos com cache multi-camada.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentsCacheService } from "@/lib/offline/AppointmentsCacheService";
import { AppointmentService } from "@/services/appointmentService";
import { formatDateToLocalISO } from "@/utils/dateUtils";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useRealtimeAppointments } from "../useRealtimeAppointments";
import { appointmentPeriodKeys } from "../useAppointmentsByPeriod";
import {
	withTimeout,
	retryWithBackoff,
	saveEmergencyBackup,
	isNetworkError,
} from "./appointmentHelpers";
import {
	getFromCacheWithMetadata,
	type AppointmentsQueryResult,
} from "./useAppointmentsCache";

export const appointmentKeys = {
	all: ["appointments_v2"] as const,
	lists: () => [...appointmentKeys.all, "list"] as const,
	list: (organizationId?: string | null) =>
		[...appointmentKeys.lists(), organizationId] as const,
	details: () => [...appointmentKeys.all, "detail"] as const,
	detail: (id: string) => [...appointmentKeys.details(), id] as const,
} as const;

async function fetchAppointments(
	organizationIdOverride?: string | null,
): Promise<AppointmentsQueryResult> {
	const timer = logger.startTimer("fetchAppointments");
	logger.info(
		"Carregando agendamentos da API principal",
		{},
		"useAppointmentsData",
	);

	if (!navigator.onLine) {
		logger.warn("Dispositivo offline, usando cache", {}, "useAppointmentsData");
		timer();
		return getFromCacheWithMetadata();
	}

	try {
		const organizationId: string | null = organizationIdOverride || null;
		if (!organizationId) {
			logger.warn(
				"Abortando fetch: organization_id não encontrado",
				{},
				"useAppointmentsData",
			);
			return {
				data: [],
				isFromCache: false,
				cacheTimestamp: null,
				source: "memory",
			};
		}

		const now = Temporal.Now.plainDateISO();
		const dateFrom = now.subtract({ days: 15 }).toString();
		const dateTo = now.add({ days: 15 }).toString();

		const data = await retryWithBackoff(() =>
			withTimeout(
				AppointmentService.fetchAppointments(organizationId, {
					dateFrom,
					dateTo,
					limit: 500,
				}),
				15000,
			),
		);

		appointmentsCacheService.saveToCache(data, organizationId || undefined);
		saveEmergencyBackup(data, organizationId || undefined);

		timer();
		return { data, isFromCache: false, cacheTimestamp: null, source: "server" };
	} catch (error: unknown) {
		logger.error(
			"Erro crítico no fetchAppointments",
			error,
			"useAppointmentsData",
		);
		timer();
		if (isNetworkError(error)) {
			logger.warn(
				"Erro de rede, usando fallback cache",
				{},
				"useAppointmentsData",
			);
		}
		return getFromCacheWithMetadata(organizationIdOverride || undefined);
	}
}

interface UseAppointmentsDataOptions {
	enabled?: boolean;
	enableRealtime?: boolean;
}

export function useAppointmentsData(options: UseAppointmentsDataOptions = {}) {
	const { profile } = useAuth();
	const queryClient = useQueryClient();
	const organizationId = profile?.organization_id;
	const isHookEnabled = options.enabled ?? true;
	const shouldEnableQuery = isHookEnabled && !!organizationId;

	useRealtimeAppointments(
		(options.enableRealtime ?? true) && shouldEnableQuery,
	);

	const appointmentsQuery = useQuery({
		queryKey: appointmentKeys.list(organizationId),
		queryFn: () => fetchAppointments(organizationId),
		staleTime: 1000 * 10,
		gcTime: 1000 * 60 * 60,
		retry: 5,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		refetchInterval: false,
		placeholderData: (previousData) => previousData,
		enabled: shouldEnableQuery,
		throwOnError: false,
	});

	const result = appointmentsQuery.data as AppointmentsQueryResult | undefined;
	const previousData = queryClient.getQueryData<AppointmentsQueryResult>(
		appointmentKeys.list(organizationId),
	);

	let finalData =
		[] as typeof appointmentsQuery.data extends AppointmentsQueryResult
			? AppointmentsQueryResult["data"]
			: never;
	type DataSource = "fresh" | "cache" | "previous";
	let dataSource: DataSource = "fresh";

	if (result?.data && result.data.length > 0) {
		finalData = result.data;
		dataSource = "fresh";
	} else if (previousData?.data && previousData.data.length > 0) {
		finalData = previousData.data;
		dataSource = "previous";
		logger.debug(
			"Usando dados anteriores do React Query como fallback",
			{ count: finalData.length },
			"useAppointmentsData",
		);
	} else if (result?.isFromCache && result.data) {
		finalData = result.data;
		dataSource = "cache";
	}

	return {
		...appointmentsQuery,
		data: finalData,
		isFromCache:
			result?.isFromCache ||
			dataSource === "cache" ||
			dataSource === "previous",
		cacheTimestamp: result?.cacheTimestamp || null,
		dataSource: result?.source || dataSource,
		isUsingStaleData: dataSource !== "fresh" && finalData.length > 0,
		hasData: finalData.length > 0,
		organizationId,
		appointmentPeriodKeys,
	};
}
