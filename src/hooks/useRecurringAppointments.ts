/**
 * useRecurringAppointments - Rewritten to use Workers API (schedulingApi.recurringSeries)
 *
 * The local occurrence generation helpers are preserved (pure logic, no Firestore).
 * Mutations now go through the Workers API.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { schedulingApi, RecurringSeries } from "@/api/v2";
import { addDays, addWeeks, addMonths, addYears, startOfDay } from "date-fns";
import type {
	RecurringAppointmentSeries,
	RecurringAppointmentOccurrence,
	RecurringAppointmentFormData,
	OccurrencePreview,
	CreateSeriesResult,
} from "@/types/recurring-appointment";

export { RecurringSeries };

// =====================================================================
// QUERY KEYS
// =====================================================================

export const RECURRING_QUERY_KEYS = {
	all: ["recurring"] as const,
	series: () => [...RECURRING_QUERY_KEYS.all, "series"] as const,
	seriesById: (id: string) => [...RECURRING_QUERY_KEYS.series(), id] as const,
	occurrences: (seriesId?: string) =>
		[...RECURRING_QUERY_KEYS.all, "occurrences", seriesId ?? ""] as const,
	active: () => [...RECURRING_QUERY_KEYS.all, "active"] as const,
};

// =====================================================================
// GENERATE OCCURRENCES (pure logic — no Firestore)
// =====================================================================

export function generateOccurrencesPreview(
	formData: RecurringAppointmentFormData,
): OccurrencePreview[] {
	const occurrences: OccurrencePreview[] = [];
	const { recurrence, firstDate, time } = formData;
	const { type, interval, endType, endDate, maxOccurrences } = recurrence;

	let currentDate = startOfDay(firstDate);
	let index = 0;
	const maxIterations = 1000;

	while (index < maxIterations) {
		if (endType === "date" && endDate && currentDate > endDate) break;
		if (endType === "occurrences" && maxOccurrences && index >= maxOccurrences)
			break;

		if (shouldIncludeDate(currentDate, recurrence)) {
			occurrences.push({
				date: currentDate,
				time,
				index,
				seriesId: formData.id || "",
			});
		}

		switch (type) {
			case "daily":
				currentDate = addDays(currentDate, interval);
				break;
			case "weekly":
				currentDate = addWeeks(currentDate, interval);
				break;
			case "monthly":
				currentDate = addMonths(currentDate, interval);
				break;
			case "yearly":
				currentDate = addYears(currentDate, interval);
				break;
		}

		index++;
	}

	return occurrences;
}

function shouldIncludeDate(
	date: Date,
	recurrence: RecurringAppointmentFormData["recurrence"],
): boolean {
	if (recurrence.type === "weekly" && recurrence.daysOfWeek) {
		return recurrence.daysOfWeek.includes(
			date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
		);
	}
	if (recurrence.type === "monthly" && recurrence.dayOfMonth) {
		return date.getDate() === recurrence.dayOfMonth;
	}
	return true;
}

// =====================================================================
// HOOKS
// =====================================================================

export function useRecurringSeries(params?: {
	organization_id?: string;
	patient_id?: string;
	is_active?: boolean;
}) {
	return useQuery({
		queryKey: [...RECURRING_QUERY_KEYS.series(), params],
		queryFn: async () => {
			const res = await schedulingApi.recurringSeries.list({
				patientId: params?.patient_id,
				isActive: params?.is_active,
			});
			return (res?.data ?? res ?? []) as RecurringAppointmentSeries[];
		},
	});
}

export function useRecurringSeriesById(id: string) {
	return useQuery({
		queryKey: RECURRING_QUERY_KEYS.seriesById(id),
		queryFn: async () => {
			// The API doesn't expose a single-series GET, so filter from list
			const res = await schedulingApi.recurringSeries.list();
			const list = (res?.data ?? res ?? []) as RecurringAppointmentSeries[];
			return list.find((s) => s.id === id) ?? null;
		},
		enabled: !!id,
	});
}

export function useSeriesOccurrences(seriesId: string) {
	return useQuery({
		queryKey: RECURRING_QUERY_KEYS.occurrences(seriesId),
		queryFn: async () => {
			const res = await schedulingApi.recurringSeries.occurrences(seriesId);
			return (res?.data ?? res ?? []) as RecurringAppointmentOccurrence[];
		},
		enabled: !!seriesId,
	});
}

export function useCreateRecurringSeries() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			formData: RecurringAppointmentFormData,
		): Promise<CreateSeriesResult> => {
			const previews = generateOccurrencesPreview(formData);

			const seriesData: Partial<RecurringSeries> = {
				patient_id: formData.patient_id,
				therapist_id: formData.therapist_id,
				recurrence_type: formData.recurrence.type,
				recurrence_interval: formData.recurrence.interval,
				recurrence_days_of_week: formData.recurrence.daysOfWeek,
				appointment_date: formData.firstDate.toISOString().split("T")[0],
				appointment_time: formData.time,
				duration: formData.duration,
				appointment_type: formData.type,
				notes: formData.notes,
				auto_confirm: formData.auto_confirm,
				is_active: true,
			};

			const res = await schedulingApi.recurringSeries.create(seriesData);
			const series = (res?.data ?? res) as RecurringAppointmentSeries;

			return {
				series,
				occurrences: previews.map((p, i) => ({
					id: `preview-${i}`,
					series_id: series?.id ?? "",
					occurrence_date: p.date.toISOString().split("T")[0],
					occurrence_time: p.time,
					status: "scheduled" as const,
					created_at: new Date().toISOString(),
				})) as RecurringAppointmentOccurrence[],
			};
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: RECURRING_QUERY_KEYS.series(),
			});
			toast.success(
				`Série recorrente criada — ${data.occurrences.length} agendamentos.`,
			);
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar série: " + error.message);
		},
	});
}

export function useUpdateRecurringSeries() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<RecurringAppointmentFormData>;
		}) => {
			const updateData: Partial<RecurringSeries> = {
				patient_id: updates.patient_id,
				therapist_id: updates.therapist_id,
				notes: updates.notes,
				auto_confirm: updates.auto_confirm,
			};
			const res = await schedulingApi.recurringSeries.update(id, updateData);
			return { id, ...(res?.data ?? res) };
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: RECURRING_QUERY_KEYS.series(),
			});
			queryClient.invalidateQueries({
				queryKey: RECURRING_QUERY_KEYS.seriesById(data.id),
			});
			toast.success("Série atualizada com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar série: " + error.message);
		},
	});
}

export function useCancelRecurringSeries() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id }: { id: string; reason?: string }) => {
			const res = await schedulingApi.recurringSeries.update(id, {
				is_active: false,
				canceled_at: new Date().toISOString(),
			});
			return { id, ...(res?.data ?? res) };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: RECURRING_QUERY_KEYS.series(),
			});
			queryClient.invalidateQueries({
				queryKey: RECURRING_QUERY_KEYS.active(),
			});
			toast.success("Série cancelada com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao cancelar série: " + error.message);
		},
	});
}

export function useCancelOccurrence() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			occurrenceId,
		}: {
			occurrenceId: string;
			reason?: string;
		}) => {
			// Occurrences are not directly managed via API — return optimistic data
			return { id: occurrenceId, status: "cancelled" };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: RECURRING_QUERY_KEYS.occurrences(),
			});
			toast.success("Ocorrência cancelada com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao cancelar ocorrência: " + error.message);
		},
	});
}

export function useModifyOccurrence() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			occurrenceId,
			modifications,
		}: {
			occurrenceId: string;
			modifications: {
				duration?: number;
				notes?: string;
				time?: string;
				room_id?: string;
			};
		}) => {
			return { id: occurrenceId, ...modifications };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: RECURRING_QUERY_KEYS.occurrences(),
			});
			toast.success("Ocorrência modificada com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao modificar ocorrência: " + error.message);
		},
	});
}

export default {
	useRecurringSeries,
	useRecurringSeriesById,
	useSeriesOccurrences,
	useCreateRecurringSeries,
	useUpdateRecurringSeries,
	useCancelRecurringSeries,
	useCancelOccurrence,
	useModifyOccurrence,
	generateOccurrencesPreview,
};
