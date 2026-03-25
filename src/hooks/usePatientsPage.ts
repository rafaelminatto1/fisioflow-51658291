/**
 * usePatientsPage - Hook para dados da página de Pacientes (Library Mode)
 *
 * Substitui o loader/action do Framework Mode por React Query.
 *
 * @version 1.0.0 - Library Mode Migration
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { patientsApi } from "@/api/v2/patients";
import { useAuth } from "@/hooks/useAuth";
import {
	calculatePatientStats,
	classifyPatient,
	fetchAllAppointments,
	fetchFinalizedSessions,
} from "@/hooks/usePatientStats";
import { fisioLogger as logger } from "@/lib/errors/logger";
import type { PatientRow } from "@/types/workers";

export interface PatientsFilters {
	search?: string;
	status?: string;
	condition?: string;
	classification?: string;
	page?: number;
	pageSize?: number;
}

export interface PatientsPageData {
	patients: PatientRow[];
	totalCount: number;
	statsMap: Record<string, any>;
	uniqueConditions: string[];
}

export function usePatientsPageData(filters: PatientsFilters = {}) {
	const queryClient = useQueryClient();
	const { organizationId } = useAuth();

	const {
		search = "",
		status = "all",
		condition = "all",
		classification = "all",
		page = 1,
		pageSize = 20,
	} = filters;

	const {
		data: patientsResponse,
		isLoading: isLoadingPatients,
		error: patientsError,
	} = useQuery({
		queryKey: [
			"patients-list",
			search,
			status,
			condition,
			classification,
			page,
			pageSize,
		],
		queryFn: async () => {
			try {
				const res = await patientsApi.list({
					status: status === "all" ? undefined : status,
					search: search || undefined,
					limit: pageSize,
					offset: (page - 1) * pageSize,
				});
				return res;
			} catch (error) {
				logger.error("Error loading patients", { error }, "usePatientsPage");
				throw error;
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 2,
		gcTime: 1000 * 60 * 5,
	});

	const patients = patientsResponse?.data ?? [];
	const totalCount = patientsResponse?.total ?? 0;

	const { data: statsMap = {}, isLoading: isLoadingStats } = useQuery({
		queryKey: ["patients-stats", patients.map((p) => p.id).join(",")],
		queryFn: async () => {
			const statsMap: Record<string, any> = {};

			await Promise.all(
				patients.map(async (patient) => {
					const [appointments, soapRecords] = await Promise.all([
						fetchAllAppointments(patient.id),
						fetchFinalizedSessions(patient.id),
					]);

					const stats = calculatePatientStats({
						appointments,
						soapRecords,
					});

					const patientClassification = classifyPatient(stats);
					statsMap[patient.id] = {
						...stats,
						classification: patientClassification,
					};
				}),
			);

			return statsMap;
		},
		enabled: patients.length > 0,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const uniqueConditions = useMemo(() => {
		const conditions = patients
			.map((p) => p.main_condition)
			.filter((c): c is string => Boolean(c));
		return Array.from(new Set(conditions));
	}, [patients]);

	const createMutation = useMutation({
		mutationFn: async (data: Partial<PatientRow>) => {
			const res = await patientsApi.create(data);
			return res?.data ?? res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patients-list"] });
			toast.success("Paciente criado com sucesso");
		},
		onError: (error) => {
			logger.error("Error creating patient", { error }, "usePatientsPage");
			toast.error("Erro ao criar paciente");
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: { id: string; patient: Partial<PatientRow> }) => {
			const res = await patientsApi.update(data.id, data.patient);
			return res?.data ?? res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patients-list"] });
			queryClient.invalidateQueries({ queryKey: ["patients-stats"] });
			toast.success("Paciente atualizado com sucesso");
		},
		onError: (error) => {
			logger.error("Error updating patient", { error }, "usePatientsPage");
			toast.error("Erro ao atualizar paciente");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			await patientsApi.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patients-list"] });
			toast.success("Paciente excluído com sucesso");
		},
		onError: (error) => {
			logger.error("Error deleting patient", { error }, "usePatientsPage");
			toast.error("Erro ao excluir paciente");
		},
	});

	const isLoading = isLoadingPatients || isLoadingStats;

	return {
		data: {
			patients,
			totalCount,
			statsMap,
			uniqueConditions,
		} as PatientsPageData,
		mutations: {
			create: createMutation.mutateAsync,
			update: updateMutation.mutateAsync,
			delete: deleteMutation.mutateAsync,
		},
		isLoading,
		error: patientsError,
		refetch: () => {
			queryClient.invalidateQueries({ queryKey: ["patients-list"] });
			queryClient.invalidateQueries({ queryKey: ["patients-stats"] });
		},
	};
}
