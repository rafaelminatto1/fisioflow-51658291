/**
 * useSmartDashboard - Hook para dados do Dashboard (Library Mode)
 *
 * Substitui o loader/action do Framework Mode por React Query.
 * Includes all data from original loader: metrics, predictions, forecasts,
 * staff performance, self assessments, and medical returns.
 *
 * @version 2.0.0 - Library Mode Migration
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	differenceInDays,
	endOfWeek,
	format,
	isValid,
	parseISO,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
} from "date-fns";
import { useMemo } from "react";
import { innovationsApi } from "@/api/v2";
import { appointmentsApi } from "@/api/v2/appointments";
import { type Notification, notificationsApi } from "@/api/v2/communications";
import { financialApi } from "@/api/v2/financial";
import { gamificationApi } from "@/api/v2/gamification";
import { analyticsApi } from "@/api/v2/insights";
import { patientsApi } from "@/api/v2/patients";
import { profileApi } from "@/api/v2/system";
import { useAuth } from "@/hooks/useAuth";
import { fisioLogger as logger } from "@/lib/errors/logger";
import type {
	AppointmentRow,
	ContaFinanceira,
	DashboardResponse,
	Pagamento,
	PatientRow,
	TherapistSummary,
	GamificationStats,
	AtRiskPatient,
	PatientPrediction,
	RevenueForecast,
	StaffPerformanceMetric,
	PatientSelfAssessment,
} from "@/types/workers";
import { formatDateToLocalISO } from "@/utils/dateUtils";

export type ViewMode = "today" | "week" | "month" | "custom";

const DEFAULT_MEDICAL_RETURN_DAYS = 14;

const isCompletedStatus = (status: unknown) =>
	["atendido", "completed", "concluido", "realizado"].includes(
		String(status ?? "").toLowerCase(),
	);
const isCancelledStatus = (status: unknown) =>
	["cancelado", "cancelled", "remarcar"].includes(
		String(status ?? "").toLowerCase(),
	);
const isNoShowStatus = (status: unknown) =>
	[
		"faltou",
		"faltou_com_aviso",
		"faltou_sem_aviso",
		"nao_atendido",
		"nao_atendido_sem_cobranca",
		"no_show",
		"falta",
	].includes(String(status ?? "").toLowerCase());

const toDate = (value: unknown) => {
	if (!value) return null;
	const date = new Date(value as string);
	return isNaN(date.getTime()) ? null : date;
};

const sumRevenue = (rows: ContaFinanceira[]) =>
	rows.reduce((acc, row) => acc + Number(row.valor ?? 0), 0);

const isBirthdayToday = (birthDate: string | null | undefined): boolean => {
	if (!birthDate) return false;
	const todayStr = format(new Date(), "MM-dd");
	return birthDate.slice(5, 10) === todayStr;
};

export interface DashboardMetrics {
	pacientesAtivos: number;
	activePatients: number; // Alias
	totalPacientes: number;
	pacientesNovos: number;
	agendamentosHoje: number;
	appointmentsToday: number; // Alias
	agendamentosConcluidos: number;
	agendamentosRestantes: number;
	taxaNoShow: number;
	noShowRate: number; // Alias para compatibilidade
	receitaMensal: number;
	monthlyRevenue: number; // Alias
	receitaMesAnterior: number;
	crescimentoMensal: number;
	tendenciaSemanal: Array<{
		dia: string;
		agendamentos: number;
		concluidos: number;
	}>;
	fisioterapeutasAtivos: number;
	agendamentosSemana: number;
	pendingEvolutions: number;
	whatsappConfirmationsPending: number;
	financialToday: {
		received: number;
		projected: number;
	};
	revenueChart: Array<{
		date: string;
		revenue: number;
	}>;
	clinicalImprovement: number;
	evolutionChart: Array<{
		day: number;
		actualPain: number;
		actualMobility: number;
		predictedPain: number;
	}>;
	targetRevenue: number;
	engagementScore: number;
	patientsAtRisk: number;
	occupancyRate: number;
	retentionRate: number;
	avgTicket: number;
}

export interface SmartDashboardData {
	metrics: DashboardMetrics;
	predictions: PatientPrediction[];
	medicalReturnsUpcoming: PatientRow[];
	forecasts: RevenueForecast[];
	staffPerformance: StaffPerformanceMetric[];
	selfAssessments: PatientSelfAssessment[];
	notifications: Notification[];
	birthdaysToday: PatientRow[];
	staffBirthdaysToday: TherapistSummary[];
	viewMode: ViewMode;
	patients: PatientRow[];
	appointmentsToday: AppointmentRow[];
	appointmentsWeek: AppointmentRow[];
	appointmentsMonth: AppointmentRow[];
	therapists: TherapistSummary[];
	gamificationStats: GamificationStats | null;
	atRiskPatients: AtRiskPatient[];
	analyticsDashboard: DashboardResponse | null;
}

export function useSmartDashboardData(viewMode: ViewMode = "today") {
	const queryClient = useQueryClient();
	const { organizationId } = useAuth();

	const now = useMemo(() => new Date(), []);
	const todayStr = formatDateToLocalISO(now);
	const startCurrentMonthDate = startOfMonth(now);
	const startCurrentMonth = formatDateToLocalISO(startCurrentMonthDate);
	const startLastMonthDate = startOfMonth(subMonths(now, 1));
	const endLastMonthDate = subDays(startCurrentMonthDate, 1);
	const thirtyDaysAgo = formatDateToLocalISO(subMonths(now, 1));
	const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
	const weekEndDate = endOfWeek(now, { weekStartsOn: 1 });
	const weekStart = formatDateToLocalISO(weekStartDate);
	const weekEnd = formatDateToLocalISO(weekEndDate);

	const primaryDateFrom =
		viewMode === "week"
			? weekStart
			: viewMode === "month"
				? startCurrentMonth
				: todayStr;
	const primaryDateTo = viewMode === "week" ? weekEnd : todayStr;

	// Fetch all data in parallel
	const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
		queryKey: ["dashboard-patients"],
		queryFn: async () => {
			try {
				const res = await patientsApi.list({ limit: 200 });
				return (res?.data ?? []) as PatientRow[];
			} catch (error) {
				logger.error("Error loading patients", { error }, "useSmartDashboard");
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: therapists = [], isLoading: isLoadingTherapists } = useQuery({
		queryKey: ["dashboard-therapists"],
		queryFn: async () => {
			try {
				const res = await profileApi.listTherapists();
				return (res?.data ?? []) as TherapistSummary[];
			} catch (error) {
				logger.error(
					"Error loading therapists",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: appointmentsToday = [], isLoading: isLoadingToday } = useQuery({
		queryKey: [
			"dashboard-appointments-primary",
			primaryDateFrom,
			primaryDateTo,
		],
		queryFn: async () => {
			try {
				const res = await appointmentsApi.list({
					dateFrom: primaryDateFrom,
					dateTo: primaryDateTo,
					limit: 1000,
				});
				return (res?.data ?? []) as AppointmentRow[];
			} catch (error) {
				logger.error(
					"Error loading appointments",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 1,
		gcTime: 1000 * 60 * 5,
	});

	const { data: appointments30d = [], isLoading: isLoading30d } = useQuery({
		queryKey: ["dashboard-appointments-30d", thirtyDaysAgo, todayStr],
		queryFn: async () => {
			try {
				const res = await appointmentsApi.list({
					dateFrom: thirtyDaysAgo,
					dateTo: todayStr,
					limit: 1000,
				});
				return (res?.data ?? []) as AppointmentRow[];
			} catch (error) {
				logger.error(
					"Error loading 30d appointments",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: appointmentsWeek = [], isLoading: isLoadingWeek } = useQuery({
		queryKey: ["dashboard-appointments-week", weekStart, weekEnd],
		queryFn: async () => {
			try {
				const res = await appointmentsApi.list({
					dateFrom: weekStart,
					dateTo: weekEnd,
					limit: 1000,
				});
				return (res?.data ?? []) as AppointmentRow[];
			} catch (error) {
				logger.error(
					"Error loading week appointments",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: appointmentsMonth = [], isLoading: isLoadingMonth } = useQuery({
		queryKey: ["dashboard-appointments-month", startCurrentMonth, todayStr],
		queryFn: async () => {
			try {
				const res = await appointmentsApi.list({
					dateFrom: startCurrentMonth,
					dateTo: todayStr,
					limit: 1000,
				});
				return (res?.data ?? []) as AppointmentRow[];
			} catch (error) {
				logger.error(
					"Error loading month appointments",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
	});

	const { data: contas = [], isLoading: isLoadingContas } = useQuery({
		queryKey: ["dashboard-contas"],
		queryFn: async () => {
			try {
				const res = await financialApi.contas.list({
					tipo: "receita",
					status: "pago",
					limit: 1000,
				});
				return (res?.data ?? []) as ContaFinanceira[];
			} catch (error) {
				logger.error("Error loading contas", { error }, "useSmartDashboard");
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { isLoading: isLoadingPagamentos } = useQuery({
		queryKey: ["dashboard-pagamentos"],
		queryFn: async () => {
			try {
				const res = await financialApi.pagamentos.list({ limit: 1000 });
				return (res?.data ?? []) as Pagamento[];
			} catch (error) {
				logger.error(
					"Error loading pagamentos",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});
	
	const { data: gamificationStats = null, isLoading: isLoadingGamification } = useQuery({
		queryKey: ["dashboard-gamification-stats"],
		queryFn: async () => {
			try {
				const res = await gamificationApi.getAdminStats();
				return res?.data as GamificationStats;
			} catch (error) {
				logger.error("Error loading gamification stats", { error }, "useSmartDashboard");
				return null;
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
	});

	const { data: atRiskPatients = [], isLoading: isLoadingAtRisk } = useQuery({
		queryKey: ["dashboard-at-risk-patients"],
		queryFn: async () => {
			try {
				const res = await gamificationApi.getAtRiskPatients();
				return (res?.data ?? []) as AtRiskPatient[];
			} catch (error) {
				logger.error("Error loading at-risk patients", { error }, "useSmartDashboard");
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
	});

	const { data: analyticsDashboard = null, isLoading: isLoadingAnalytics } = useQuery({
		queryKey: ["dashboard-analytics-insights"],
		queryFn: async () => {
			try {
				const res = await analyticsApi.dashboard({ period: viewMode });
				return res as DashboardResponse;
			} catch (error) {
				logger.error("Error loading analytics insights", { error }, "useSmartDashboard");
				return null;
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
	});

	const { data: predictions = [], isLoading: isLoadingPredictions } = useQuery({
		queryKey: ["dashboard-predictions"],
		queryFn: async () => {
			try {
				const res = await innovationsApi.appointmentPredictions.list({
					limit: 50,
				});
				return res?.data ?? [];
			} catch (error) {
				logger.error(
					"Error loading predictions",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: forecasts = [], isLoading: isLoadingForecasts } = useQuery({
		queryKey: ["dashboard-forecasts"],
		queryFn: async () => {
			try {
				const res = await innovationsApi.revenueForecasts.list({ limit: 90 });
				return res?.data ?? [];
			} catch (error) {
				logger.error("Error loading forecasts", { error }, "useSmartDashboard");
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: staffPerformance = [], isLoading: isLoadingStaff } = useQuery({
		queryKey: ["dashboard-staff-performance"],
		queryFn: async () => {
			try {
				const res = await innovationsApi.staffPerformance.list();
				return res?.data ?? [];
			} catch (error) {
				logger.error(
					"Error loading staff performance",
					{ error },
					"useSmartDashboard",
				);
				return [];
			}
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
	});

	const { data: selfAssessments = [], isLoading: isLoadingAssessments } =
		useQuery({
			queryKey: ["dashboard-self-assessments"],
			queryFn: async () => {
				try {
					const res = await innovationsApi.patientSelfAssessments.list({
						limit: 100,
					});
					return res?.data ?? [];
				} catch (error) {
					logger.error(
						"Error loading self assessments",
						{ error },
						"useSmartDashboard",
					);
					return [];
				}
			},
			enabled: !!organizationId,
			staleTime: 1000 * 60 * 5,
			gcTime: 1000 * 60 * 15,
		});

	const { data: notifications = [], isLoading: isLoadingNotifications } =
		useQuery({
			queryKey: ["dashboard-notifications"],
			queryFn: async () => {
				try {
					const res = await notificationsApi.list();
					return (res?.data ?? []) as Notification[];
				} catch (error) {
					logger.error(
						"Error loading notifications",
						{ error },
						"useSmartDashboard",
					);
					return [];
				}
			},
			enabled: !!organizationId,
			staleTime: 1000 * 60 * 1,
			gcTime: 1000 * 60 * 5,
		});

	// Calculate birthdays
	const birthdaysToday = useMemo(
		() => patients.filter((p) => isBirthdayToday(p.birth_date)),
		[patients],
	);

	const staffBirthdaysToday = useMemo(
		() => therapists.filter((t) => isBirthdayToday(t.birth_date)),
		[therapists],
	);

	// Calculate medical returns
	const medicalReturnsUpcoming = useMemo(() => {
		const todayStart = startOfDay(now);
		return patients
			.filter((p) => {
				const rawDate = p.medical_return_date;
				if (!rawDate) return false;
				const date = parseISO(rawDate);
				if (!isValid(date)) return false;
				const days = differenceInDays(startOfDay(date), todayStart);
				return days >= 0 && days <= DEFAULT_MEDICAL_RETURN_DAYS;
			})
			.sort(
				(a, b) =>
					new Date(a.medical_return_date!).getTime() -
					new Date(b.medical_return_date!).getTime(),
			);
	}, [patients, now]);

	// Calculate metrics
	const metrics = useMemo<DashboardMetrics>(() => {
		const pacientesAtivosCount = new Set(
			appointments30d
				.filter((a) => !isCancelledStatus(a.status))
				.map((a) => a.patient_id),
		).size;

		const agendamentosHoje = appointmentsToday.filter(
			(a) => !isCancelledStatus(a.status),
		).length;

		const agendamentosConcluidos = appointmentsToday.filter((a) =>
			isCompletedStatus(a.status),
		).length;

		const totalAppointments30d = appointments30d.filter(
			(a) => !isCancelledStatus(a.status),
		).length;

		const noShowCount = appointments30d.filter((a) =>
			isNoShowStatus(a.status),
		).length;

		const isDateInRange = (val: any, from: Date, to: Date) => {
			const d = toDate(val);
			return d ? d >= from && d <= to : false;
		};

		const receitaMensal = sumRevenue(
			contas.filter((r) =>
				isDateInRange(
					r.pago_em ?? r.data_vencimento,
					startCurrentMonthDate,
					now,
				),
			),
		);

		const receitaMesAnterior = sumRevenue(
			contas.filter((r) =>
				isDateInRange(
					r.pago_em ?? r.data_vencimento,
					startLastMonthDate,
					endLastMonthDate,
				),
			),
		);

		// Weekly trend
		const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
		const tendenciaSemanal = weekDays.map((dia, i) => {
			const dayStr = formatDateToLocalISO(subDays(weekEndDate, 6 - i));
			const dayApts = appointmentsWeek.filter((a) =>
				a.date && String(a.date).startsWith(dayStr),
			);
			return {
				dia,
				agendamentos: dayApts.length,
				concluidos: dayApts.filter((a) => isCompletedStatus(a.status)).length,
			};
		});

		const taxaNoShow =
			totalAppointments30d > 0
				? Math.round((noShowCount / totalAppointments30d) * 100)
				: 0;

		const adData = analyticsDashboard?.data;

		const metrics: DashboardMetrics = {
			pacientesAtivos: adData?.activePatients ?? pacientesAtivosCount,
			activePatients: adData?.activePatients ?? pacientesAtivosCount,
			totalPacientes: patients.length,
			pacientesNovos: patients.filter((p) => {
				const created = toDate(p.created_at);
				return created ? created >= startCurrentMonthDate : false;
			}).length,
			agendamentosHoje: adData?.appointmentsToday ?? agendamentosHoje,
			appointmentsToday: adData?.appointmentsToday ?? agendamentosHoje,
			agendamentosConcluidos,
			agendamentosRestantes: Math.max(
				0,
				agendamentosHoje - agendamentosConcluidos,
			),
			taxaNoShow: adData?.noShowRate ?? taxaNoShow,
			noShowRate: adData?.noShowRate ?? taxaNoShow,
			receitaMensal: adData?.monthlyRevenue ?? receitaMensal,
			monthlyRevenue: adData?.monthlyRevenue ?? receitaMensal,
			receitaMesAnterior,
			crescimentoMensal:
				receitaMesAnterior > 0
					? Math.round(
							((receitaMensal - receitaMesAnterior) / receitaMesAnterior) * 100,
						)
					: 0,
			tendenciaSemanal,
			fisioterapeutasAtivos: therapists.length,
			agendamentosSemana: appointmentsWeek.length,
			pendingEvolutions: adData?.pendingEvolutions ?? 0,
			whatsappConfirmationsPending: adData?.whatsappConfirmationsPending ?? 0,
			financialToday: adData?.financialToday ?? {
				received: 0,
				projected: 0,
			},
			revenueChart: adData?.revenueChart ?? [],
			engagementScore:
				adData?.engagementScore ?? gamificationStats?.engagementRate ?? 0,
			patientsAtRisk:
				atRiskPatients.length || adData?.patientsAtRisk || 0,
			occupancyRate: Math.round(
				(agendamentosHoje / Math.max(1, therapists.length * 8)) * 100,
			),
			retentionRate: (() => {
				const uniquePatientsLast30d = new Set(
					appointments30d.map((a) => a.patient_id),
				);
				if (uniquePatientsLast30d.size === 0) return 0;
				const futureApts = appointmentsWeek.filter(
					(a) => a.date && new Date(a.date as string) > now,
				);
				const returnedPatients = new Set(
					futureApts
						.filter((a) => uniquePatientsLast30d.has(a.patient_id))
						.map((a) => a.patient_id),
				);
				return Math.round(
					(returnedPatients.size / uniquePatientsLast30d.size) * 100,
				);
			})(),
			avgTicket:
				pacientesAtivosCount > 0
					? Math.round(receitaMensal / pacientesAtivosCount)
					: 0,
			clinicalImprovement: (() => {
				if (selfAssessments.length < 2) return 0;
				const scores = selfAssessments
					.map((s: PatientSelfAssessment) => Number(s.pain_level || 0))
					.filter((s: number) => !isNaN(s));
				if (scores.length < 2) return 0;
				// Newest score is at 0
				const first = scores[scores.length - 1];
				const last = scores[0];
				return first > 0 ? Math.round(((last - first) / first) * 100) : 0;
			})(),
			evolutionChart: (() => {
				const data = selfAssessments.slice(0, 10).reverse().map((s: PatientSelfAssessment, idx: number) => ({
					day: idx + 1,
					actualPain: Number(s.pain_level || 0),
					actualMobility: Number(s.mobility_score || 0),
					predictedPain: Math.max(0, 10 - (idx + 1) * 0.8), // Target: pain goes down
				}));
				return data;
			})(),
			targetRevenue: forecasts[0]?.predicted_revenue ?? receitaMensal * 1.1,
		};

		return metrics;
	}, [
		appointmentsToday,
		appointments30d,
		appointmentsWeek,
		patients,
		therapists,
		contas,
		gamificationStats,
		atRiskPatients,
		analyticsDashboard,
		startCurrentMonthDate,
		startLastMonthDate,
		endLastMonthDate,
		now,
		weekEndDate,
	]);


	const isLoading =
		isLoadingPatients ||
		isLoadingTherapists ||
		isLoadingToday ||
		isLoading30d ||
		isLoadingWeek ||
		isLoadingMonth ||
		isLoadingContas ||
		isLoadingPagamentos ||
		isLoadingPredictions ||
		isLoadingForecasts ||
		isLoadingStaff ||
		isLoadingAssessments ||
		isLoadingNotifications ||
		isLoadingGamification ||
		isLoadingAtRisk ||
		isLoadingAnalytics;

	return {
		data: {
			metrics,
			predictions,
			medicalReturnsUpcoming,
			forecasts,
			staffPerformance,
			selfAssessments,
			notifications,
			birthdaysToday,
			staffBirthdaysToday,
			viewMode,
			patients,
			appointmentsToday,
			appointmentsWeek,
			appointmentsMonth,
			atRiskPatients: atRiskPatients.map((p) => ({
				...p,
				name: p.patient_name || p.name,
				days_since_last: p.days_since_last ?? p.days_inactive ?? p.daysInactive ?? 0,
				risk_score: p.risk_score ?? p.level ?? 0,
			})),
			analyticsDashboard,
		} as SmartDashboardData,
		mutations: {
			generateSummary: async ({
				patients,
				appointments,
			}: {
				patients: PatientRow[];
				appointments: AppointmentRow[];
			}) => {
				try {
					// O dashboard wide summary pode ser gerado a partir de aiApi.summarize se tivermos os dados brutos,
					// ou podemos usar o analyticsDashboard.data.activePatients etc para compor um prompt.
					// Por enquanto, restauramos a lógica que funcionava ou um fallback seguro.
					if (patients.length > 0) {
						// Se temos pacientes, podemos gerar um resumo geral (mockando o input esperado pelo genkit)
						// No futuro, teremos um endpoint específico 'dashboardSummary' no aiApi
						return "Resumo inteligente gerado com base nos dados atuais: " + 
							`${patients.length} pacientes ativos e ${appointments.length} agendamentos hoje.`;
					}
					return "Resumo não disponível no momento.";
				} catch (error) {
					logger.error("Error in generateSummary mutation", { error }, "useSmartDashboard");
					return "Erro ao gerar resumo.";
				}
			},
		},
		isLoading,
		refetch: () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
	};
}
