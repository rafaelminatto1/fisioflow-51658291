import { useQuery } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";
import type { Appointment, SessionRecord } from "@/types";
import { request } from "@/utils/request";

// ============================================================================================
// TYPES & CONSTANTS
// ============================================================================================

export type PatientClassification =
	| "active"
	| "inactive_7"
	| "inactive_30"
	| "inactive_custom"
	| "no_show_risk"
	| "has_unpaid"
	| "new_patient"
	| "completed_treatment";

export interface PatientStats {
	sessionsCompleted: number;
	firstEvaluationDate?: string;
	lastAppointmentDate?: string;
	daysSinceLastAppointment: number;
	unpaidSessionsCount: number;
	noShowCount: number;
	missedAppointmentsCount: number;
	upcomingAppointmentsCount: number;
	totalAppointments: number;
	classification: PatientClassification;
}

export interface PatientClassificationFilter {
	value: PatientClassification;
	label: string;
	description: string;
	icon: string;
	color: string;
}

const QUERY_CONFIG = {
	STALE_TIME: 1000 * 60 * 15, // 15 minutos
};

export const PATIENT_CLASSIFICATIONS: Record<
	PatientClassification,
	PatientClassificationFilter
> = {
	active: {
		value: "active",
		label: "Ativos",
		description: "Pacientes em tratamento regular",
		icon: "🟢",
		color: "green",
	},
	inactive_7: {
		value: "inactive_7",
		label: "Inativos (7+ dias)",
		description: "Sem comparecimento há mais de 7 dias",
		icon: "🟡",
		color: "yellow",
	},
	inactive_30: {
		value: "inactive_30",
		label: "Inativos (30+ dias)",
		description: "Sem comparecimento há mais de 30 dias",
		icon: "🔴",
		color: "red",
	},
	inactive_custom: {
		value: "inactive_custom",
		label: "Inativos (60+ dias)",
		description: "Sem comparecimento há mais de 60 dias",
		icon: "⭕",
		color: "gray",
	},
	no_show_risk: {
		value: "no_show_risk",
		label: "Risco de No-Show",
		description: "Pacientes com faltas não justificadas",
		icon: "🚫",
		color: "orange",
	},
	has_unpaid: {
		value: "has_unpaid",
		label: "Com Pendências",
		description: "Possuem sessões pagas e não compareceram",
		icon: "💰",
		color: "yellow",
	},
	new_patient: {
		value: "new_patient",
		label: "Novos Pacientes",
		description: "Ainda não realizaram sessões",
		icon: "🆕",
		color: "blue",
	},
	completed_treatment: {
		value: "completed_treatment",
		label: "Tratamento Concluído",
		description: "Pacientes com status concluído",
		icon: "✅",
		color: "green",
	},
} as const;

// ============================================================================================
// HOOKS (Otimizados para usar as rotas do backend)
// ============================================================================================

export const usePatientStats = (patientId: string | undefined) => {
	return useQuery({
		queryKey: ["patient-stats", patientId],
		queryFn: async (): Promise<PatientStats> => {
			if (!patientId) {
				throw new Error("ID do paciente não fornecido");
			}

			// Chama o endpoint de estatísticas agregadas, que é infinitamente mais
			// rápido do que baixar todas as sessões e consultas para a RAM.
			const res = await request<{ data: PatientStats }>(
				`/api/patients/stats/${encodeURIComponent(patientId)}/detailed-stats`
			);

			if (!res || !res.data) {
			    throw new Error("Falha ao obter estatísticas");
			}

			return res.data;
		},
		enabled: !!patientId,
		staleTime: QUERY_CONFIG.STALE_TIME,
	});
};

export const useMultiplePatientStats = (patientIds: string[]) => {
	return useQuery({
		queryKey: ["multiple-patient-stats", patientIds],
		queryFn: async (): Promise<Record<string, PatientStats>> => {
			if (!patientIds.length) {
				return {};
			}

			// Chamada em batch para o servidor Neon
			const res = await request<{ data: Record<string, PatientStats> }>(
				"/api/patients/stats/bulk",
				{
					method: "POST",
					body: JSON.stringify({ patientIds }),
				}
			);

			return res?.data || {};
		},
		enabled: patientIds.length > 0,
		staleTime: QUERY_CONFIG.STALE_TIME,
	});
};

// ============================================================================================
// EXPORTED UTILITY FUNCTIONS
// ============================================================================================

export function formatFirstEvaluationDate(dateString?: string): string {
	if (!dateString) return "N/A";

	const date = new Date(dateString);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Hoje";
	if (diffDays === 1) return "Ontem";
	if (diffDays < 7) return `${diffDays} dias atrás`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
	return `${Math.floor(diffDays / 365)} anos atrás`;
}

export function formatDate(dateString?: string): string {
	if (!dateString) return "N/A";

	return new Date(dateString).toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

export function getClassificationFilter(
	classification: PatientClassification,
): PatientClassificationFilter | undefined {
	return PATIENT_CLASSIFICATIONS[classification];
}

export function getAllClassificationFilters(): PatientClassificationFilter[] {
	return Object.values(PATIENT_CLASSIFICATIONS);
}
