/**
 * usePatientEvolution - Migrated to Neon/Workers
 *
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAppointmentData } from "@/hooks/useAppointmentData";
import { useCreateSoapRecord, useSoapRecords } from "@/hooks/useSoapRecords";
import { useAppointmentActions } from "@/hooks/useAppointmentActions";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
	normalizeGoalRow,
	normalizeGoalRows,
} from "@/lib/clinical/goalNormalization";
import { getErrorMessage } from "@/types";
import { goalsApi, patientsApi, evolutionApi } from "@/api/v2";

// Types
import {
	Surgery,
	MedicalReturn,
	PatientGoal,
	Pathology,
} from "@/types/evolution";

// Re-using types from @/types/evolution

export interface PathologyRequiredMeasurement {
	id: string;
	pathology_name: string;
	measurement_name: string;
	measurement_unit?: string;
	alert_level: "high" | "medium" | "low";
	instructions?: string;
}

/**
 * Medição de evolução do paciente.
 * Para testes com múltiplos valores (ex.: Y Balance: anterior, posteromedial, posterolateral),
 * os valores individuais ficam em custom_data e value é um composto (ex.: média) para gráficos.
 */
export interface EvolutionMeasurement {
	id: string;
	soap_record_id?: string;
	patient_id: string;
	measurement_type: string;
	measurement_name: string;
	value: number;
	unit?: string;
	notes?: string;
	custom_data?: Record<string, unknown>;
	measured_at: string;
	created_by: string;
	created_at: string;
}

export interface Appointment {
	id: string;
	patient_id?: string;
	therapist_id?: string;
	date?: string;
	time?: string;
	status?: string;
	[key: string]: unknown;
}

export interface Patient {
	id: string;
	full_name?: string;
	email?: string;
	phone?: string;
	[key: string]: unknown;
}

export interface SoapRecord {
	id: string;
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
}

export interface UseEvolutionMeasurementsOptions {
	/**
	 * Limit the number of measurements fetched. Helps speed up pages that only
	 * need the most recent records (e.g., evolution page initial load).
	 */
	limit?: number;
	/**
	 * Allow callers to defer the request (React Query `enabled`).
	 */
	enabled?: boolean;
}

// Hook para cirurgias
export const usePatientSurgeries = (patientId: string) => {
	return useQuery({
		queryKey: ["patient-surgeries", patientId],
		queryFn: async () => {
			const res = await patientsApi.surgeries(patientId);
			return (res?.data ?? []).map((row) => ({
				id: row.id,
				patient_id: patientId,
				surgery_name: row.name,
				surgery_date: row.surgery_date ?? row.created_at,
				affected_side: row.affected_side || "nao_aplicavel",
				notes: row.notes ?? undefined,
				surgeon: row.surgeon_name ?? row.surgeon ?? undefined,
				hospital: row.hospital ?? undefined,
				surgery_type: row.surgery_type ?? row.post_op_protocol ?? undefined,
				complications: row.complications ?? undefined,
				created_at: row.created_at,
				updated_at: row.created_at,
			})) as Surgery[];
		},
		enabled: !!patientId,
		// OTIMIZAÇÃO: Aumentado staleTime para reduzir requisições
		staleTime: 1000 * 60 * 15, // 15 minutos - dados secundários mudam pouco
		gcTime: 1000 * 60 * 30, // 30 minutos
	});
};

// Hook para retornos médicos
export const usePatientMedicalReturns = (patientId: string) => {
	return useQuery({
		queryKey: ["patient-medical-returns", patientId],
		queryFn: async () => {
			const res = await patientsApi.medicalReturns(patientId);
			return (res?.data ?? []) as MedicalReturn[];
		},
		enabled: !!patientId,
		staleTime: 1000 * 60 * 10, // 10 minutos
		retry: false,
	});
};

// Hook para objetivos
export const usePatientGoals = (patientId: string) => {
	return useQuery({
		queryKey: ["patient-goals", patientId],
		queryFn: async () => {
			const res = await goalsApi.list(patientId);
			return normalizeGoalRows(res?.data);
		},
		enabled: !!patientId,
		// OTIMIZAÇÃO: Aumentado staleTime - objetivos mudam pouco durante uma sessão
		staleTime: 1000 * 60 * 10, // 10 minutos
		gcTime: 1000 * 60 * 30, // 30 minutos
	});
};

// Hook para patologias
const mapPathologyStatus = (value?: string | null): Pathology["status"] => {
	if (!value) return "cronica";
	if (value === "active") return "em_tratamento";
	if (value === "treated") return "tratada";
	if (value === "monitoring") return "cronica";
	return "cronica";
};

export const usePatientPathologies = (patientId: string) => {
	return useQuery({
		queryKey: ["patient-pathologies", patientId],
		queryFn: async () => {
			const res = await patientsApi.pathologies(patientId);
			return (res?.data ?? []).map((row) => ({
				id: row.id,
				patient_id: patientId,
				pathology_name: row.name,
				cid_code: row.icd_code ?? undefined,
				diagnosis_date: row.diagnosed_at ?? undefined,
				severity: undefined,
				affected_region: undefined,
				status: mapPathologyStatus(row.status),
				notes: row.notes ?? undefined,
				created_at: row.created_at,
				updated_at: row.created_at,
			})) as Pathology[];
		},
		enabled: !!patientId,
		// OTIMIZAÇÃO: Aumentado staleTime - patologias mudam muito raramente
		staleTime: 1000 * 60 * 20, // 20 minutos
		gcTime: 1000 * 60 * 45, // 45 minutos
	});
};

// Hook para medições obrigatórias baseadas nas patologias
export const useRequiredMeasurements = (pathologyNames: string[]) => {
	const uniquePathologies = useMemo(
		() => Array.from(new Set(pathologyNames.filter(Boolean))),
		[pathologyNames],
	);

	return useQuery({
		queryKey: ["required-measurements", uniquePathologies],
		queryFn: async () => {
			if (uniquePathologies.length === 0) return [];
			const res =
				await evolutionApi.requiredMeasurements.list(uniquePathologies);
			return (res?.data ?? []) as PathologyRequiredMeasurement[];
		},
		enabled: uniquePathologies.length > 0,
		// OTIMIZAÇÃO: Cache maior pois medições obrigatórias mudam raramente
		staleTime: 1000 * 60 * 30, // 30 minutos
		gcTime: 1000 * 60 * 60, // 1 hora (garbage collection)
	});
};

// Hook para medições de evolução
export const useEvolutionMeasurements = (
	patientId: string,
	options: UseEvolutionMeasurementsOptions = {},
) => {
	const { limit: resultsLimit, enabled = true } = options;

	return useQuery({
		queryKey: ["evolution-measurements", patientId, resultsLimit ?? "all"],
		queryFn: async () => {
			const res = await evolutionApi.measurements.list(
				patientId,
				resultsLimit ? { limit: resultsLimit } : undefined,
			);
			const data = res?.data ?? [];
			return data.map((row) => ({
				id: row.id,
				soap_record_id: row.soap_record_id ?? undefined,
				patient_id: row.patient_id,
				measurement_type: row.measurement_type,
				measurement_name: row.measurement_name,
				value: Number(row.value ?? 0),
				unit: row.unit ?? undefined,
				notes: row.notes ?? undefined,
				custom_data: row.custom_data ?? undefined,
				measured_at: row.measured_at,
				created_by: row.created_by,
				created_at: row.created_at,
			})) as EvolutionMeasurement[];
		},
		enabled: !!patientId && enabled,
		// OTIMIZAÇÃO: Cache mais curto para medições pois podem ser adicionadas durante a sessão
		staleTime: 1000 * 60 * 5, // 5 minutos
		gcTime: 1000 * 60 * 15, // 15 minutos
	});
};

// Hook para criar medição
export const useCreateMeasurement = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (
			measurement: Omit<EvolutionMeasurement, "id" | "created_at">,
		) => {
			const res = await evolutionApi.measurements.create({
				patient_id: measurement.patient_id,
				measurement_type: measurement.measurement_type,
				measurement_name: measurement.measurement_name,
				value: measurement.value,
				unit: measurement.unit,
				notes: measurement.notes,
				custom_data: measurement.custom_data,
				measured_at: measurement.measured_at,
			});
			const data = res?.data;
			if (!data) throw new Error("Falha ao registrar medição");
			return {
				id: data.id,
				soap_record_id: measurement.soap_record_id,
				patient_id: data.patient_id,
				measurement_type: data.measurement_type,
				measurement_name: data.measurement_name,
				value: Number(data.value ?? 0),
				unit: data.unit ?? undefined,
				notes: data.notes ?? undefined,
				custom_data: data.custom_data ?? undefined,
				measured_at: data.measured_at,
				created_by: data.created_by,
				created_at: data.created_at,
			} as EvolutionMeasurement;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: [
					"evolution-measurements",
					(data as EvolutionMeasurement).patient_id,
				],
			});
			toast({
				title: "Medição registrada",
				description: "A medição foi registrada com sucesso.",
			});
		},
		onError: (error) => {
			toast({
				title: "Erro ao registrar medição",
				description: error.message,
				variant: "destructive",
			});
		},
	});
};

// Hook para atualizar objetivo
export const useUpdateGoal = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			goalId,
			data,
		}: {
			goalId: string;
			data: Partial<PatientGoal>;
		}) => {
			const res = await goalsApi.update(goalId, {
				goal_title: data.goal_title,
				goal_description: data.goal_description,
				description: data.goal_title,
				category: data.category,
				target_date: data.target_date,
				target_value: data.target_value,
				current_value: data.current_value,
				current_progress: data.current_progress,
				priority: data.priority,
				status: data.status,
				completed_at: data.completed_at,
			});
			if (!res?.data) throw new Error("Falha ao atualizar objetivo");
			return normalizeGoalRow(res.data);
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["patient-goals", data.patient_id],
			});
			toast({ title: "Objetivo atualizado com sucesso" });
		},
	});
};

// Hook para completar objetivo
export const useCompleteGoal = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (goalId: string) => {
			const res = await goalsApi.update(goalId, {
				status: "concluido",
				completed_at: new Date().toISOString(),
			});
			if (!res?.data) throw new Error("Falha ao concluir objetivo");
			return normalizeGoalRow(res.data);
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["patient-goals", data.patient_id],
			});
			toast({ title: "🎉 Objetivo concluído!" });
		},
	});
};

// Hook para criar objetivo
export const useCreateGoal = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (
			goal: Omit<
				PatientGoal,
				"id" | "created_at" | "updated_at" | "created_by" | "status"
			> & { status?: PatientGoal["status"] },
		) => {
			const payload = {
				patient_id: goal.patient_id,
				goal_title: goal.goal_title,
				goal_description: goal.goal_description,
				description: goal.goal_title,
				category: goal.category,
				target_date: goal.target_date,
				target_value: goal.target_value,
				current_value: goal.current_value,
				current_progress: goal.current_progress,
				priority: goal.priority,
				status: goal.status || "em_andamento",
			};
			const res = await goalsApi.create(payload);
			if (!res?.data) throw new Error("Falha ao criar objetivo");
			return normalizeGoalRow(res.data);
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["patient-goals", (data as PatientGoal).patient_id],
			});
			toast({
				title: "Objetivo criado",
				description: "O objetivo foi criado com sucesso.",
			});
		},
		onError: (error) => {
			toast({
				title: "Erro ao criar objetivo",
				description: error.message,
				variant: "destructive",
			});
		},
	});
};

// Hook para atualizar status do objetivo
export const useUpdateGoalStatus = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			goalId,
			status,
		}: {
			goalId: string;
			status: "em_andamento" | "concluido" | "cancelado";
		}) => {
			const updates: Record<string, unknown> = {
				status,
			};
			if (status === "concluido") {
				updates.completed_at = new Date().toISOString();
			}
			const res = await goalsApi.update(goalId, updates);
			if (!res?.data) throw new Error("Falha ao atualizar objetivo");
			return normalizeGoalRow(res.data);
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["patient-goals", (data as PatientGoal).patient_id],
			});
			toast({
				title: "Objetivo atualizado",
				description: "O status do objetivo foi atualizado.",
			});
		},
	});
};

// Hook para excluir objetivo
export const useDeleteGoal = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (goalId: string) => {
			await goalsApi.delete(goalId);
			return goalId;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patient-goals"] });
			toast({ title: "Objetivo excluído com sucesso" });
		},
	});
};

// Consolidated hook for patient evolution page
// This hook combines all the logic needed for the PatientEvolution page
export interface PatientEvolutionData {
	appointment: Appointment | null;
	patient: Patient | null;
	patientId: string | null;
	surgeries: Surgery[];
	medicalReturns: MedicalReturn[];
	goals: PatientGoal[];
	pathologies: Pathology[];
	measurements: EvolutionMeasurement[];
	previousEvolutions: SoapRecord[];
	evolutionStats: {
		totalEvolutions: number;
		completedGoals: number;
		totalGoals: number;
		activePathologiesCount: number;
		totalMeasurements: number;
		avgGoalProgress: number;
		completionRate: number;
	};
}

export function usePatientEvolutionData() {
	const { appointmentId } = useParams<{ appointmentId: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();

	// Data fetching
	const {
		appointment,
		patient,
		patientId,
		isLoading: dataLoading,
		appointmentError,
		patientError,
	} = useAppointmentData(appointmentId);

	const { data: surgeries = [] } = usePatientSurgeries(patientId || "");
	const { data: medicalReturns = [] } = usePatientMedicalReturns(
		patientId || "",
	);
	const { data: goals = [] } = usePatientGoals(patientId || "");
	const { data: pathologies = [] } = usePatientPathologies(patientId || "");
	const { data: measurements = [] } = useEvolutionMeasurements(patientId || "");
	const { data: previousEvolutions = [] } = useSoapRecords(patientId || "", 10);

	const { completeAppointment, isCompleting } = useAppointmentActions();
	const { awardXp } = useGamification(patientId || "");
	const createSoapRecord = useCreateSoapRecord();

	// Calculate evolution stats
	const evolutionStats = useMemo(() => {
		const totalEvolutions = previousEvolutions.length;
		const completedGoals = goals.filter((g) => g.status === "concluido").length;
		const totalGoals = goals.length;
		const activePathologiesCount = pathologies.filter(
			(p) => p.status === "em_tratamento",
		).length;
		const totalMeasurements = measurements.length;

		const avgGoalProgress =
			goals.length > 0
				? goals
						.filter((g) => g.status === "em_andamento")
						.reduce((sum) => sum + 50, 0) /
					Math.max(1, goals.filter((g) => g.status === "em_andamento").length)
				: 0;

		return {
			totalEvolutions,
			completedGoals,
			totalGoals,
			activePathologiesCount,
			totalMeasurements,
			avgGoalProgress: Math.round(avgGoalProgress),
			completionRate:
				totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
		};
	}, [previousEvolutions, goals, pathologies, measurements]);

	// Handlers
	const handleSave = useCallback(
		async (soapData: Partial<SoapRecord>) => {
			if (!patientId) return;
			if (
				!soapData.subjective &&
				!soapData.objective &&
				!soapData.assessment &&
				!soapData.plan
			) {
				return { error: "Campos vazios" };
			}

			try {
				const record = await createSoapRecord.mutateAsync({
					patient_id: patientId,
					appointment_id: appointmentId,
					...soapData,
				});

				// Save to treatment_sessions (Workers API)
				const user = getCurrentUser();
				if (user && appointmentId) {
					await evolutionApi.treatmentSessions.upsert({
						patient_id: patientId,
						appointment_id: appointmentId,
						therapist_id: user.uid,
						subjective: soapData.subjective,
						objective: soapData.objective,
						assessment: soapData.assessment,
						plan: soapData.plan,
						observations: soapData.assessment || "",
						pain_level_before: 0,
						pain_level_after: 0,
						session_date: new Date().toISOString().split("T")[0],
					});
				}

				return { data: record, error: null };
			} catch (error: unknown) {
				return {
					data: null,
					error: getErrorMessage(error) || "Erro desconhecido",
				};
			}
		},
		[patientId, appointmentId, createSoapRecord],
	);

	const handleCompleteSession = useCallback(
		async (soapData: Partial<SoapRecord>) => {
			if (
				!soapData.subjective &&
				!soapData.objective &&
				!soapData.assessment &&
				!soapData.plan
			) {
				return { error: "Campos vazios" };
			}

			const saveResult = await handleSave(soapData);
			if (!saveResult || saveResult.error)
				return saveResult || { error: "Erro ao salvar" };

			if (appointmentId) {
				completeAppointment(appointmentId, {
					onSuccess: async () => {
						if (patientId) {
							try {
								await awardXp.mutateAsync({
									amount: 100,
									reason: "session_completed",
									description: "Sessão de fisioterapia concluída",
								});
							} catch (e) {
								logger.error("Failed to award XP", e, "usePatientEvolution");
							}
						}
						setTimeout(() => navigate("/agenda"), 1500);
					},
				});
			}

			return saveResult;
		},
		[
			appointmentId,
			patientId,
			handleSave,
			completeAppointment,
			awardXp,
			navigate,
		],
	);

	return {
		data: {
			appointment,
			patient,
			patientId,
			surgeries,
			medicalReturns,
			goals,
			pathologies,
			measurements,
			previousEvolutions,
			evolutionStats,
		} as PatientEvolutionData,
		loading: dataLoading,
		error: appointmentError || patientError,
		isSaving: createSoapRecord.isPending,
		isCompleting,
		handleSave,
		handleCompleteSession,
	};
}
