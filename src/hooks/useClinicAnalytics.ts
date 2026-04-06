/**
 * Hooks para analytics e métricas da clínica - Migrated to Neon/Cloudflare
 * @module hooks/useClinicAnalytics
 */

import { useQuery } from "@tanstack/react-query";
import {
	subDays,
	subMonths,
	startOfDay,
	startOfWeek,
	startOfMonth,
} from "date-fns";
import { useOrganizations } from "./useOrganizations";
import {
	generateDashboardMetrics,
	generateTrendData,
	ClinicDashboardMetrics,
	TrendData,
} from "@/lib/analytics/clinic-metrics";
import {
	appointmentsApi,
	patientsApi,
	profileApi,
	financialApi,
} from "@/api/v2";

// =====================================================================
// CONFIG
// =====================================================================

const BUSINESS_HOURS = {
	start: 7,
	end: 21,
	slotDuration: 30,
} as const;

const QUERY_KEYS = {
	all: ["analytics"] as const,
	dashboard: (period: string) =>
		[...QUERY_KEYS.all, "dashboard", period] as const,
	trends: (period: string, metric: string) =>
		[...QUERY_KEYS.all, "trends", period, metric] as const,
};

const isoDate = (date: Date) => date.toISOString().split("T")[0];

const clampDateRange = (
	period: PeriodType,
	startOverride?: Date,
	endOverride?: Date,
) => {
	if (startOverride && endOverride) {
		return { start: startOverride, end: endOverride };
	}
	const end = endOverride ?? new Date();
	let start: Date;

	switch (period) {
		case "today":
			start = startOfDay(end);
			break;
		case "week":
			start = startOfWeek(end, { weekStartsOn: 1 });
			break;
		case "month":
			start = startOfMonth(end);
			break;
		case "quarter":
			start = subMonths(end, 3);
			break;
		case "year":
			start = subMonths(end, 12);
			break;
		default:
			start = startOfMonth(end);
	}

	return { start, end };
};

const toAppointmentSummary = (row: {
	date?: string;
	start_time?: string;
	end_time?: string;
	status?: string;
	therapist_id?: string;
	patient_id?: string;
}) => {
	const duration =
		row.start_time && row.end_time
			? (new Date(`1970-01-01T${row.end_time}`).getTime() -
					new Date(`1970-01-01T${row.start_time}`).getTime()) /
				(60 * 1000)
			: undefined;
	return {
		date: row.date ?? "",
		time: row.start_time ?? "",
		status: row.status ?? "",
		therapist_id: row.therapist_id,
		patient_id: row.patient_id,
		duration: duration && duration > 0 ? duration : undefined,
	};
};

const isDateBetween = (value: string | undefined, start: Date, end: Date) => {
	if (!value) return false;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return false;
	return parsed >= start && parsed <= end;
};

const isCompletedStatus = (status: string | undefined) => {
	const normalized = (status ?? "").toLowerCase();
	return ["completed", "concluido", "realizado", "atendido"].includes(
		normalized,
	);
};

// ============================================================================
// TYPES
// ============================================================================

interface _DatabaseDoc {
	id: string;
	[key: string]: unknown;
}

interface _Appointment {
	id: string;
	patient_id?: string;
	therapist_id?: string;
	date: string;
	time?: string;
	status: string;
	[key: string]: unknown;
}

// =====================================================================
// HOOK: DASHBOARD METRICS
// =====================================================================

type PeriodType = "today" | "week" | "month" | "quarter" | "year" | "custom";

interface DashboardMetricsOptions {
	period?: PeriodType;
	startDate?: Date;
	endDate?: Date;
}

export function useDashboardMetrics(options: DashboardMetricsOptions = {}) {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;
	const { period = "month", startDate, endDate } = options;

	const { start, end } = clampDateRange(period, startDate, endDate);

	return useQuery({
		queryKey: [...QUERY_KEYS.dashboard(period), organizationId],
		queryFn: async (): Promise<ClinicDashboardMetrics> => {
			if (!organizationId) throw new Error("Organização não identificada");

			const startIso = isoDate(start);
			const endIso = isoDate(end);

			const [appointmentsRes, patientsRes, therapistsRes, paymentsRes] =
				await Promise.all([
					appointmentsApi.list({
						dateFrom: startIso,
						dateTo: endIso,
						limit: 5000,
					}),
					patientsApi.list({
						limit: 5000,
						offset: 0,
						sortBy: "created_at_desc",
					}),
					profileApi.listTherapists().catch(() => ({ data: [] })),
					financialApi.pagamentos.list({ limit: 5000 }),
				]);

			const appointments = (appointmentsRes?.data ?? []).map(
				toAppointmentSummary,
			);
			const lastAppointmentByPatient: Record<string, string> = {};
			appointments.forEach((apt) => {
				if (!apt.patient_id) return;
				const timestamp = new Date(
					`${apt.date}T${apt.time || "00:00:00"}`,
				).toISOString();
				const previous = lastAppointmentByPatient[apt.patient_id];
				if (!previous || timestamp > previous) {
					lastAppointmentByPatient[apt.patient_id] = timestamp;
				}
			});

			const patients = (patientsRes?.data ?? []).map((patient) => ({
				id: patient.id,
				created_at: patient.created_at ?? "",
				status: patient.status,
				last_appointment: lastAppointmentByPatient[patient.id]
					? lastAppointmentByPatient[patient.id].split("T")[0]
					: undefined,
			}));

			const therapists = (therapistsRes?.data ?? []).map((therapist) => ({
				id: therapist.id,
				name: therapist.full_name ?? therapist.name ?? "Fisioterapeuta",
			}));

			const payments = (paymentsRes?.data ?? [])
				.filter(
					(payment) =>
						payment.status === "paid" &&
						isDateBetween(payment.pago_em ?? payment.created_at, start, end),
				)
				.map((payment) => ({
					date: payment.pago_em ?? payment.created_at ?? "",
					amount: Number(payment.valor ?? 0),
					status: payment.status ?? "paid",
					appointment_id: payment.appointment_id ?? undefined,
				}));

			return generateDashboardMetrics(
				appointments,
				patients,
				therapists,
				payments,
				start,
				end,
				BUSINESS_HOURS,
			);
		},
		enabled: !!organizationId,
		staleTime: 5 * 60 * 1000,
		gcTime: 15 * 60 * 1000,
	});
}

// =====================================================================
// HOOK: APPOINTMENT TRENDS
// =====================================================================

interface TrendsOptions {
	period?: PeriodType;
	groupBy?: "day" | "week" | "month";
}

export function useAppointmentTrends(options: TrendsOptions = {}) {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;
	const { period = "month", groupBy = "day" } = options;

	return useQuery({
		queryKey: [...QUERY_KEYS.trends(period, "appointments"), organizationId],
		queryFn: async (): Promise<TrendData[]> => {
			if (!organizationId) return [];
			const { start, end } = clampDateRange(period);
			const appointmentsRes = await appointmentsApi.list({
				dateFrom: isoDate(start),
				dateTo: isoDate(end),
				limit: 5000,
			});
			const completedAppointments = (appointmentsRes?.data ?? [])
				.filter((appointment) => isCompletedStatus(appointment.status))
				.map((appointment) => ({ date: appointment.date ?? "", value: 1 }));
			return generateTrendData(completedAppointments, start, end, groupBy);
		},
		enabled: !!organizationId,
		staleTime: 10 * 60 * 1000, // 10 minutes
	});
}

// =====================================================================
// HOOK: REVENUE TRENDS
// =====================================================================

export function useRevenueTrends(options: TrendsOptions = {}) {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;
	const { period = "month", groupBy = "day" } = options;

	return useQuery({
		queryKey: [...QUERY_KEYS.trends(period, "revenue"), organizationId],
		queryFn: async (): Promise<TrendData[]> => {
			if (!organizationId) return [];
			const { start, end } = clampDateRange(period);
			const paymentsRes = await financialApi.pagamentos.list({ limit: 5000 });
			const paymentData = (paymentsRes?.data ?? [])
				.filter(
					(payment) =>
						payment.status === "paid" &&
						isDateBetween(payment.pago_em ?? payment.created_at, start, end),
				)
				.map((payment) => ({
					date: payment.pago_em ?? payment.created_at ?? "",
					value: Number(payment.valor ?? 0),
				}));
			return generateTrendData(paymentData, start, end, groupBy);
		},
		enabled: !!organizationId,
		staleTime: 10 * 60 * 1000, // 10 minutes
	});
}

// =====================================================================
// HOOK: PATIENT TRENDS
// =====================================================================

export function usePatientTrends(options: TrendsOptions = {}) {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;
	const { period = "month", groupBy = "day" } = options;

	return useQuery({
		queryKey: [...QUERY_KEYS.trends(period, "patients"), organizationId],
		queryFn: async (): Promise<TrendData[]> => {
			if (!organizationId) return [];
			const { start, end } = clampDateRange(period);
			const patientsRes = await patientsApi.list({
				createdFrom: isoDate(start),
				createdTo: isoDate(end),
				limit: 5000,
			});
			const newPatients = (patientsRes?.data ?? []).map((patient) => ({
				date: patient.created_at ?? "",
				value: 1,
			}));
			return generateTrendData(newPatients, start, end, groupBy);
		},
		enabled: !!organizationId,
		staleTime: 10 * 60 * 1000, // 10 minutes
	});
}

// =====================================================================
// HOOK: COMPARISON METRICS
// =====================================================================

interface ComparisonMetricsOptions {
	currentPeriod: PeriodType;
}

export function useComparisonMetrics(options: ComparisonMetricsOptions) {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;
	const { currentPeriod = "month" } = options;

	return useQuery({
		queryKey: ["analytics", "comparison", currentPeriod, organizationId],
		queryFn: async () => {
			if (!organizationId) return null;
			const end = new Date();
			let currentStart: Date;
			let previousEnd: Date;
			let previousStart: Date;

			switch (currentPeriod) {
				case "today":
					currentStart = startOfDay(end);
					previousEnd = subDays(currentStart, 1);
					previousStart = startOfDay(previousEnd);
					break;
				case "week":
					currentStart = startOfWeek(end, { weekStartsOn: 1 });
					previousEnd = subDays(currentStart, 1);
					previousStart = startOfWeek(previousEnd, { weekStartsOn: 1 });
					break;
				case "month":
					currentStart = startOfMonth(end);
					previousEnd = subDays(currentStart, 1);
					previousStart = startOfMonth(previousEnd);
					break;
				case "quarter":
					currentStart = subMonths(end, 3);
					previousEnd = subDays(currentStart, 1);
					previousStart = subMonths(previousEnd, 3);
					break;
				case "year":
					currentStart = subMonths(end, 12);
					previousEnd = subDays(currentStart, 1);
					previousStart = subMonths(previousEnd, 12);
					break;
				default:
					currentStart = startOfMonth(end);
					previousEnd = subDays(currentStart, 1);
					previousStart = startOfMonth(previousEnd);
			}

			const [currentSnap, previousSnap] = await Promise.all([
				appointmentsApi.list({
					dateFrom: isoDate(currentStart),
					dateTo: isoDate(end),
					limit: 5000,
				}),
				appointmentsApi.list({
					dateFrom: isoDate(previousStart),
					dateTo: isoDate(previousEnd),
					limit: 5000,
				}),
			]);

			const currentTotal = currentSnap?.data?.length ?? 0;
			const previousTotal = previousSnap?.data?.length ?? 0;

			const change = currentTotal - previousTotal;
			const changePercent =
				previousTotal > 0 ? (change / previousTotal) * 100 : 0;

			let trend: "up" | "down" | "neutral" = "neutral";
			if (changePercent > 5) trend = "up";
			if (changePercent < -5) trend = "down";

			return {
				current: currentTotal,
				previous: previousTotal,
				change,
				changePercent: Math.round(changePercent * 10) / 10,
				trend,
			};
		},
		enabled: !!organizationId,
		staleTime: 15 * 60 * 1000, // 15 minutes
	});
}

// =====================================================================
// HOOK: TOP PERFORMERS
// =====================================================================

interface TopPerformer {
	id: string;
	name: string;
	value: number;
	label: string;
}

export function useTopPerformers(
	metric: "appointments" | "revenue" = "appointments",
) {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;

	return useQuery({
		queryKey: ["analytics", "top-performers", metric, organizationId],
		queryFn: async (): Promise<TopPerformer[]> => {
			if (!organizationId) return [];
			const start = startOfMonth(new Date());
			const end = new Date();

			if (metric === "appointments") {
				const [appointmentsRes, therapistsRes] = await Promise.all([
					appointmentsApi.list({
						dateFrom: isoDate(start),
						dateTo: isoDate(end),
						limit: 5000,
					}),
					profileApi.listTherapists().catch(() => ({ data: [] })),
				]);

				const therapistNames = new Map<string, string>();
				(therapistsRes?.data ?? []).forEach((therapist) => {
					therapistNames.set(
						therapist.id,
						therapist.full_name ?? therapist.name ?? "Desconhecido",
					);
				});

				const counts = new Map<string, { name: string; count: number }>();
				(appointmentsRes?.data ?? []).forEach((apt) => {
					if (!isCompletedStatus(apt.status)) return;
					const therapistId = apt.therapist_id;
					if (!therapistId) return;
					const current = counts.get(therapistId) || {
						name: therapistNames.get(therapistId) ?? "Unknown",
						count: 0,
					};
					counts.set(therapistId, { ...current, count: current.count + 1 });
				});

				return Array.from(counts.entries())
					.map(([id, { name, count }]) => ({
						id,
						name,
						value: count,
						label: `${count} agendamentos`,
					}))
					.sort((a, b) => b.value - a.value)
					.slice(0, 5);
			}

			return [];
		},
		enabled: !!organizationId,
		staleTime: 30 * 60 * 1000, // 30 minutes
	});
}

// =====================================================================
// EXPORTS
// =====================================================================

export default useDashboardMetrics;
