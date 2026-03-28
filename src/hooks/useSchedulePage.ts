/**
 * useSchedulePage - Hook para dados da página de Agenda (Library Mode)
 *
 * Substitui o loader/action do Framework Mode por React Query.
 * Mantém a mesma funcionalidade com cache granular e optimistic updates.
 *
 * @version 1.0.0 - Library Mode Migration
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import { toast } from "sonner";
import { appointmentsApi } from "@/api/v2/appointments";
import { patientsApi } from "@/api/v2/patients";
import { profileApi } from "@/api/v2/system";
import { useAuth } from "@/hooks/useAuth";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { AppointmentService } from "@/services/appointmentService";
import type {
	AppointmentRow,
	PatientRow,
	TherapistProfileRow,
} from "@/types/workers";

export type ViewType = "day" | "week" | "month";

export interface ScheduleFilters {
	status: string[];
	types: string[];
	therapists: string[];
	patient?: string;
}

export interface SchedulePageData {
	appointments: AppointmentRow[];
	therapists: TherapistProfileRow[];
	patients: PatientRow[];
	birthdaysToday: PatientRow[];
	staffBirthdaysToday: TherapistProfileRow[];
	organizationId: string;
}

const isBirthdayToday = (birthDate: string | null | undefined): boolean => {
	if (!birthDate) return false;
	const todayStr = format(new Date(), "MM-dd");
	return birthDate.slice(5, 10) === todayStr;
};

export function useSchedulePageData(
	date: string,
	view: ViewType,
	filters?: ScheduleFilters,
) {
	const queryClient = useQueryClient();
	const { organizationId: authOrgId } = useAuth();

	const {
		data: appointments = [],
		isLoading: isLoadingAppointments,
		error: appointmentsError,
	} = useQuery({
		queryKey: [
			"schedule-appointments",
			date,
			view,
			filters?.status,
			filters?.therapists,
		],
		queryFn: async () => {
			try {
				let dateFrom = date;
				let dateTo = date;

				if (view === "week") {
					const startOfWeek = new Date(date);
					// Ajustar para o início da semana (segunda-feira como no componente)
					const day = startOfWeek.getDay();
					const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
					startOfWeek.setDate(diff);

					const endOfWeek = new Date(startOfWeek);
					endOfWeek.setDate(startOfWeek.getDate() + 6);

					dateFrom = format(startOfWeek, "yyyy-MM-dd");
					dateTo = format(endOfWeek, "yyyy-MM-dd");
				} else if (view === "month") {
					const startOfMonth = new Date(date);
					startOfMonth.setDate(1);

					const endOfMonth = new Date(date);
					endOfMonth.setMonth(endOfMonth.getMonth() + 1);
					endOfMonth.setDate(0);

					dateFrom = format(startOfMonth, "yyyy-MM-dd");
					dateTo = format(endOfMonth, "yyyy-MM-dd");
				}

				const res = await appointmentsApi.list({
					dateFrom,
					dateTo,
					viewType: view,
					status:
						filters?.status && filters.status.length > 0
							? filters.status.join(",")
							: undefined,
					therapistId:
						filters?.therapists && filters.therapists.length > 0
							? filters.therapists.join(",")
							: undefined,
				});
				return res?.data ?? [];
			} catch (error) {
				logger.error(
					"Error loading appointments",
					{ error },
					"useSchedulePage",
				);
				throw error;
			}
		},
		staleTime: 1000 * 60 * 2,
		gcTime: 1000 * 60 * 5,
	});

	const { data: therapists = [], isLoading: isLoadingTherapists } = useQuery({
		queryKey: ["schedule-therapists"],
		queryFn: async () => {
			try {
				const res = await profileApi.listTherapists();
				return res?.data ?? [];
			} catch (error) {
				logger.error("Error loading therapists", { error }, "useSchedulePage");
				return [];
			}
		},
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
		queryKey: ["schedule-patients"],
		queryFn: async () => {
			try {
				const res = await patientsApi.list({ limit: 50 });
				return res?.data ?? [];
			} catch (error) {
				logger.error("Error loading patients", { error }, "useSchedulePage");
				return [];
			}
		},
		staleTime: 1000 * 60 * 2,
		gcTime: 1000 * 60 * 5,
	});

	const birthdaysToday = useMemo(
		() => patients.filter((p) => isBirthdayToday(p.birth_date)),
		[patients],
	);

	const staffBirthdaysToday = useMemo(
		() => therapists.filter((t) => isBirthdayToday(t.birth_date)),
		[therapists],
	);

	const createMutation = useMutation({
		mutationFn: async (data: {
			appointment: Record<string, unknown>;
			organizationId: string;
		}) => {
			return await AppointmentService.createAppointment(data.appointment);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["schedule-appointments"],
			});
			toast.success("Agendamento criado com sucesso");
		},
		onError: (error) => {
			logger.error("Error creating appointment", { error }, "useSchedulePage");
			toast.error("Erro ao criar agendamento");
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: {
			id: string;
			appointment: Record<string, unknown>;
			organizationId: string;
		}) => {
			return await AppointmentService.updateAppointment(
				data.id,
				data.appointment,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["schedule-appointments"],
			});
			toast.success("Agendamento atualizado com sucesso");
		},
		onError: (error) => {
			logger.error("Error updating appointment", { error }, "useSchedulePage");
			toast.error("Erro ao atualizar agendamento");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (data: { id: string; organizationId: string }) => {
			return await AppointmentService.deleteAppointment(
				data.id,
				data.organizationId,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["schedule-appointments"],
			});
			toast.success("Agendamento excluído com sucesso");
		},
		onError: (error) => {
			logger.error("Error deleting appointment", { error }, "useSchedulePage");
			toast.error("Erro ao excluir agendamento");
		},
	});

	const updateStatusMutation = useMutation({
		mutationFn: async (data: { id: string; status: string }) => {
			return await AppointmentService.updateStatus(data.id, data.status);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["schedule-appointments"],
			});
			toast.success("Status atualizado com sucesso");
		},
		onError: (error) => {
			logger.error("Error updating status", { error }, "useSchedulePage");
			toast.error("Erro ao atualizar status");
		},
	});

	const isLoading =
		isLoadingAppointments || isLoadingTherapists || isLoadingPatients;

	return {
		data: {
			appointments,
			therapists,
			patients,
			birthdaysToday,
			staffBirthdaysToday,
			organizationId: authOrgId || "",
		} as SchedulePageData,
		mutations: {
			create: createMutation.mutateAsync,
			update: updateMutation.mutateAsync,
			delete: deleteMutation.mutateAsync,
			updateStatus: updateStatusMutation.mutateAsync,
		},
		isLoading,
		error: appointmentsError,
		refetch: () => {
			queryClient.invalidateQueries({
				queryKey: ["schedule-appointments"],
			});
		},
	};
}
