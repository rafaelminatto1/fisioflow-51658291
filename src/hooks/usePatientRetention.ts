import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	differenceInDays,
	format,
	parseISO,
	startOfMonth,
	subDays,
	subMonths,
} from "date-fns";
import { CACHE_TIMES, STALE_TIMES } from "@/lib/queryConfig";
import { PatientHelpers } from "@/types";
import {
	appointmentsApi,
	crmApi,
	financialApi,
	patientsApi,
} from "@/api/v2";

const RETENTION_KEYS = {
	all: ["retention"] as const,
	metrics: () => [...RETENTION_KEYS.all, "metrics"] as const,
	patientsAtRisk: (minScore: number) =>
		[...RETENTION_KEYS.all, "at-risk", minScore] as const,
	cohorts: (months: number) =>
		[...RETENTION_KEYS.all, "cohorts", months] as const,
	trends: (months: number) =>
		[...RETENTION_KEYS.all, "trends", months] as const,
};

export interface RetentionMetrics {
	churnRate: number;
	retentionRate: number;
	averageLTV: number;
	totalPatients: number;
	activePatients: number;
	inactivePatients: number;
	dormantPatients: number;
	atRiskCount: number;
	projectedRevenueLoss: number;
}

export interface PatientAtRisk {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	lastAppointmentDate: string | null;
	daysSinceLastSession: number;
	cancellationRate: number;
	totalSessions: number;
	riskScore: number;
	riskFactors: string[];
	averageSessionValue: number;
}

export interface CohortData {
	cohortMonth: string;
	totalPatients: number;
	retention: number[];
}

export interface ChurnTrend {
	month: string;
	churnRate: number;
	churnCount: number;
	totalActive: number;
}

export interface ReactivationCampaign {
	id: string;
	name: string;
	templateMessage: string;
	patientIds: string[];
	status: "draft" | "scheduled" | "sent" | "completed";
	scheduledAt: string | null;
	sentAt: string | null;
	responseRate: number | null;
	createdAt: string;
}

function calculateRiskScore(
	daysSinceLastSession: number,
	cancellationRate: number,
	totalSessions: number,
): { score: number; factors: string[] } {
	let score = 0;
	const factors: string[] = [];

	if (daysSinceLastSession > 90) {
		score += 40;
		factors.push("Sem sessão há mais de 90 dias");
	} else if (daysSinceLastSession > 60) {
		score += 30;
		factors.push("Sem sessão há mais de 60 dias");
	} else if (daysSinceLastSession > 30) {
		score += 20;
		factors.push("Sem sessão há mais de 30 dias");
	} else if (daysSinceLastSession > 14) {
		score += 10;
		factors.push("Sem sessão há mais de 14 dias");
	}

	if (cancellationRate > 0.5) {
		score += 35;
		factors.push("Taxa de cancelamento muito alta (>50%)");
	} else if (cancellationRate > 0.3) {
		score += 25;
		factors.push("Taxa de cancelamento alta (>30%)");
	} else if (cancellationRate > 0.15) {
		score += 15;
		factors.push("Taxa de cancelamento moderada (>15%)");
	}

	if (totalSessions <= 2) {
		score += 25;
		factors.push("Paciente novo (poucas sessões)");
	} else if (totalSessions <= 5) {
		score += 15;
		factors.push("Paciente em fase inicial");
	} else if (totalSessions <= 10) {
		score += 5;
	}

	return { score: Math.min(100, score), factors };
}

async function loadRetentionBase(months: number = 12) {
	const [patientsRes, appointmentsRes, contasRes] = await Promise.all([
		patientsApi.list({ limit: 5000 }),
		appointmentsApi.list({
			dateFrom: subMonths(new Date(), Math.max(months + 3, 15)).toISOString(),
			limit: 5000,
		}),
		financialApi.contas.list({
			status: "pago",
			dateFrom: subMonths(new Date(), Math.max(months + 3, 15)).toISOString(),
			limit: 5000,
		}),
	]);

	return {
		patients: patientsRes?.data ?? [],
		appointments: appointmentsRes?.data ?? [],
		contas: contasRes?.data ?? [],
	};
}

export function useRetentionMetrics() {
	return useQuery({
		queryKey: RETENTION_KEYS.metrics(),
		queryFn: async (): Promise<RetentionMetrics> => {
			const now = new Date();
			const { patients, appointments, contas } = await loadRetentionBase();

			if (patients.length === 0) {
				return {
					churnRate: 0,
					retentionRate: 0,
					averageLTV: 0,
					totalPatients: 0,
					activePatients: 0,
					inactivePatients: 0,
					dormantPatients: 0,
					atRiskCount: 0,
					projectedRevenueLoss: 0,
				};
			}

			const appointmentsByPatient = new Map<string, typeof appointments>();
			appointments.forEach((appointment) => {
				if (!appointment.patient_id) return;
				const existing =
					appointmentsByPatient.get(appointment.patient_id) || [];
				existing.push(appointment);
				appointmentsByPatient.set(appointment.patient_id, existing);
			});

			const revenueByPatient = new Map<string, number>();
			contas.forEach((conta) => {
				if (!conta.patient_id) return;
				revenueByPatient.set(
					conta.patient_id,
					(revenueByPatient.get(conta.patient_id) || 0) +
						Number(conta.valor || 0),
				);
			});

			let activeCount = 0;
			let inactiveCount = 0;
			let dormantCount = 0;
			let atRiskCount = 0;
			let totalLTV = 0;
			let projectedLoss = 0;

			patients.forEach((patient) => {
				const patientAppointments = appointmentsByPatient.get(patient.id) || [];
				const completedAppointments = patientAppointments
					.filter((appointment) => appointment.status === "concluido")
					.sort(
						(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
					);

				const lastAppointment = completedAppointments[0];
				const patientLTV = revenueByPatient.get(patient.id) || 0;
				totalLTV += patientLTV;

				if (!lastAppointment?.date) {
					dormantCount += 1;
					return;
				}

				const daysSince = differenceInDays(now, parseISO(lastAppointment.date));
				if (daysSince <= 30) {
					activeCount += 1;
				} else if (daysSince <= 90) {
					inactiveCount += 1;
					atRiskCount += 1;
					const avgMonthly =
						patientLTV / Math.max(1, completedAppointments.length / 4);
					projectedLoss += avgMonthly * 3;
				} else {
					dormantCount += 1;
				}
			});

			const totalPatients = patients.length;
			const churnRate =
				totalPatients > 0
					? ((inactiveCount + dormantCount) / totalPatients) * 100
					: 0;
			const retentionRate =
				totalPatients > 0 ? (activeCount / totalPatients) * 100 : 0;
			const averageLTV = totalPatients > 0 ? totalLTV / totalPatients : 0;

			return {
				churnRate: Math.round(churnRate * 10) / 10,
				retentionRate: Math.round(retentionRate * 10) / 10,
				averageLTV: Math.round(averageLTV * 100) / 100,
				totalPatients,
				activePatients: activeCount,
				inactivePatients: inactiveCount,
				dormantPatients: dormantCount,
				atRiskCount,
				projectedRevenueLoss: Math.round(projectedLoss * 100) / 100,
			};
		},
		staleTime: STALE_TIMES.STABLE,
		gcTime: CACHE_TIMES.DEFAULT,
	});
}

export function usePatientsAtRisk(minRiskScore: number = 30) {
	return useQuery({
		queryKey: RETENTION_KEYS.patientsAtRisk(minRiskScore),
		queryFn: async (): Promise<PatientAtRisk[]> => {
			const now = new Date();
			const { patients, appointments, contas } = await loadRetentionBase();
			const activePatients = patients.filter(
				(patient) => patient.status === "ativo",
			);

			if (activePatients.length === 0) return [];

			const appointmentsByPatient = new Map<string, typeof appointments>();
			appointments.forEach((appointment) => {
				if (!appointment.patient_id) return;
				const existing =
					appointmentsByPatient.get(appointment.patient_id) || [];
				existing.push(appointment);
				appointmentsByPatient.set(appointment.patient_id, existing);
			});

			const revenueByPatient = new Map<string, number>();
			contas.forEach((conta) => {
				if (!conta.patient_id) return;
				revenueByPatient.set(
					conta.patient_id,
					(revenueByPatient.get(conta.patient_id) || 0) +
						Number(conta.valor || 0),
				);
			});

			const patientsAtRisk: PatientAtRisk[] = [];

			activePatients.forEach((patient) => {
				const patientAppointments = appointmentsByPatient.get(patient.id) || [];
				const completedAppointments = patientAppointments
					.filter((appointment) => appointment.status === "concluido")
					.sort(
						(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
					);
				const cancelledAppointments = patientAppointments.filter(
					(appointment) => appointment.status === "cancelado",
				);

				const totalAppointments = patientAppointments.length;
				const cancellationRate =
					totalAppointments > 0
						? cancelledAppointments.length / totalAppointments
						: 0;

				const lastAppointment = completedAppointments[0];
				const lastDate = lastAppointment?.date
					? parseISO(lastAppointment.date)
					: null;
				const daysSinceLastSession = lastDate
					? differenceInDays(now, lastDate)
					: 365;

				const { score, factors } = calculateRiskScore(
					daysSinceLastSession,
					cancellationRate,
					completedAppointments.length,
				);

				if (score >= minRiskScore) {
					const totalRevenue = revenueByPatient.get(patient.id) || 0;
					const avgValue =
						completedAppointments.length > 0
							? totalRevenue / completedAppointments.length
							: 0;

					patientsAtRisk.push({
						id: patient.id,
						name: PatientHelpers.getName(patient),
						email: patient.email || null,
						phone: patient.phone || null,
						lastAppointmentDate: lastAppointment?.date || null,
						daysSinceLastSession,
						cancellationRate: Math.round(cancellationRate * 100),
						totalSessions: completedAppointments.length,
						riskScore: score,
						riskFactors: factors,
						averageSessionValue: Math.round(avgValue * 100) / 100,
					});
				}
			});

			return patientsAtRisk.sort((a, b) => b.riskScore - a.riskScore);
		},
		staleTime: STALE_TIMES.STABLE,
		gcTime: CACHE_TIMES.DEFAULT,
	});
}

export function useCohortAnalysis(months: number = 12) {
	return useQuery({
		queryKey: RETENTION_KEYS.cohorts(months),
		queryFn: async (): Promise<CohortData[]> => {
			const now = new Date();
			const { patients, appointments } = await loadRetentionBase(months);

			const filteredPatients = patients.filter(
				(patient) =>
					!!patient.created_at &&
					parseISO(patient.created_at) >= subMonths(now, months),
			);
			if (filteredPatients.length === 0) return [];

			const completedAppointments = appointments.filter(
				(appointment) =>
					appointment.status === "concluido" &&
					appointment.patient_id &&
					appointment.date,
			);

			const appointmentsByPatient = new Map<string, Set<string>>();
			completedAppointments.forEach((appointment) => {
				const monthKey = format(parseISO(appointment.date), "yyyy-MM");
				const existing =
					appointmentsByPatient.get(appointment.patient_id!) ||
					new Set<string>();
				existing.add(monthKey);
				appointmentsByPatient.set(appointment.patient_id!, existing);
			});

			const cohorts = new Map<string, string[]>();
			filteredPatients.forEach((patient) => {
				const cohortMonth = format(parseISO(patient.created_at!), "yyyy-MM");
				const existing = cohorts.get(cohortMonth) || [];
				existing.push(patient.id);
				cohorts.set(cohortMonth, existing);
			});

			const cohortData: CohortData[] = [];
			const sortedCohortMonths = Array.from(cohorts.keys()).sort();

			sortedCohortMonths.forEach((cohortMonth) => {
				const patientIds = cohorts.get(cohortMonth) || [];
				const totalPatients = patientIds.length;
				const retention: number[] = [];

				for (let i = 0; i < 12; i += 1) {
					const targetMonth = format(
						new Date(
							parseISO(`${cohortMonth}-01`).getTime() +
								i * 30 * 24 * 60 * 60 * 1000,
						),
						"yyyy-MM",
					);
					if (parseISO(`${targetMonth}-01`) > now) break;

					const retainedCount = patientIds.filter((patientId) =>
						appointmentsByPatient.get(patientId)?.has(targetMonth),
					).length;

					retention.push(
						totalPatients > 0
							? Math.round((retainedCount / totalPatients) * 100)
							: 0,
					);
				}

				if (totalPatients > 0) {
					cohortData.push({ cohortMonth, totalPatients, retention });
				}
			});

			return cohortData.slice(-12);
		},
		staleTime: STALE_TIMES.STATIC,
		gcTime: CACHE_TIMES.LONG,
	});
}

export function useChurnTrends(months: number = 12) {
	return useQuery({
		queryKey: RETENTION_KEYS.trends(months),
		queryFn: async (): Promise<ChurnTrend[]> => {
			const now = new Date();
			const trends: ChurnTrend[] = [];
			const { patients, appointments } = await loadRetentionBase(months);

			if (patients.length === 0) return [];

			const completedAppointments = appointments.filter(
				(appointment) =>
					appointment.status === "concluido" &&
					appointment.patient_id &&
					appointment.date,
			);

			const lastAppointmentByPatient = new Map<string, Date>();
			completedAppointments.forEach((appointment) => {
				const appointmentDate = parseISO(appointment.date);
				const current = lastAppointmentByPatient.get(appointment.patient_id!);
				if (!current || appointmentDate > current) {
					lastAppointmentByPatient.set(
						appointment.patient_id!,
						appointmentDate,
					);
				}
			});

			for (let i = months - 1; i >= 0; i -= 1) {
				const monthStart = startOfMonth(subMonths(now, i));
				const monthEnd = startOfMonth(subMonths(now, i - 1));
				const monthKey = format(monthStart, "MMM/yy");
				let activeAtStart = 0;
				let churnedDuringMonth = 0;

				patients.forEach((patient) => {
					if (!patient.created_at) return;
					const createdAt = parseISO(patient.created_at);
					if (createdAt > monthStart) return;

					const lastAppointment = lastAppointmentByPatient.get(patient.id);
					if (!lastAppointment) return;

					const sixtyDaysBeforeMonth = subDays(monthStart, 60);
					if (
						lastAppointment >= sixtyDaysBeforeMonth &&
						lastAppointment < monthStart
					) {
						activeAtStart += 1;
						const nextAppointments = completedAppointments.filter(
							(appointment) =>
								appointment.patient_id === patient.id &&
								parseISO(appointment.date) >= monthStart &&
								parseISO(appointment.date) < monthEnd,
						);
						if (nextAppointments.length === 0) churnedDuringMonth += 1;
					}
				});

				const churnRate =
					activeAtStart > 0
						? Math.round((churnedDuringMonth / activeAtStart) * 1000) / 10
						: 0;

				trends.push({
					month: monthKey,
					churnRate,
					churnCount: churnedDuringMonth,
					totalActive: activeAtStart,
				});
			}

			return trends;
		},
		staleTime: STALE_TIMES.STATIC,
		gcTime: CACHE_TIMES.LONG,
	});
}

export function useSendReactivationCampaign() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			patientIds,
			message,
			channel,
		}: {
			patientIds: string[];
			message: string;
			channel: "whatsapp" | "email" | "sms";
		}) => {
			const res = await crmApi.campanhas.create({
				nome: `Reativação - ${format(new Date(), "dd/MM/yyyy")}`,
				tipo: channel,
				conteudo: message,
				status: "concluida",
				patient_ids: patientIds,
				concluida_em: new Date().toISOString(),
			});
			return res?.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: RETENTION_KEYS.all });
		},
	});
}
