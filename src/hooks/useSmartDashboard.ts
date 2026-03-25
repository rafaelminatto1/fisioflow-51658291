/**
 * useSmartDashboard - Hook para dados do Dashboard (Library Mode)
 *
 * Substitui o loader/action do Framework Mode por React Query.
 * Includes all data from original loader: metrics, predictions, forecasts,
 * staff performance, self assessments, and medical returns.
 *
 * @version 2.0.0 - Library Mode Migration
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	differenceInDays,
	endOfMonth,
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
import { toast } from "sonner";
import { innovationsApi } from "@/api/v2";
import { appointmentsApi } from "@/api/v2/appointments";
import { type Notification, notificationsApi } from "@/api/v2/communications";
import { financialApi } from "@/api/v2/financial";
import { patientsApi } from "@/api/v2/patients";
import { profileApi } from "@/api/v2/system";
import { useAuth } from "@/hooks/useAuth";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { generatePatientSummary } from "@/lib/genkit/patient-summary";
import type {
	AppointmentRow,
	ContaFinanceira,
	Pagamento,
	PatientRow,
	TherapistProfileRow,
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
	totalPacientes: number;
	pacientesNovos: number;
	agendamentosHoje: number;
	agendamentosConcluidos: number;
	agendamentosRestantes: number;
	taxaNoShow: number;
	receitaMensal: number;
	receitaMesAnterior: number;
	crescimentoMensal: number;
	tendenciaSemanal: Array<{
		dia: string;
		agendamentos: number;
		concluidos: number;
	}>;
	fisioterapeutasAtivos: number;
	agendamentosSemana: number;
}

export interface SmartDashboardData {
	metrics: DashboardMetrics;
	predictions: any[];
	medicalReturnsUpcoming: PatientRow[];
	forecasts: any[];
	staffPerformance: any[];
	selfAssessments: any[];
	notifications: Notification[];
	birthdaysToday: PatientRow[];
	staffBirthdaysToday: TherapistProfileRow[];
	viewMode: ViewMode;
	patients: PatientRow[];
	appointmentsToday: AppointmentRow[];
	appointmentsWeek: AppointmentRow[];
	appointmentsMonth: AppointmentRow[];
	therapists: TherapistProfileRow[];
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
				const res = await patientsApi.list({ limit: 1000 });
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
				return (res?.data ?? []) as TherapistProfileRow[];
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

	const { data: pagamentos = [], isLoading: isLoadingPagamentos } = useQuery({
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
				(a.date as string).startsWith(dayStr),
			);
			return {
				dia,
				agendamentos: dayApts.length,
				concluidos: dayApts.filter((a) => isCompletedStatus(a.status)).length,
			};
		});

		return {
			pacientesAtivos: pacientesAtivosCount,
			totalPacientes: patients.length,
			pacientesNovos: patients.filter((p) => {
				const created = toDate(p.created_at);
				return created ? created >= startCurrentMonthDate : false;
			}).length,
			agendamentosHoje,
			agendamentosConcluidos,
			agendamentosRestantes: Math.max(
				0,
				agendamentosHoje - agendamentosConcluidos,
			),
			taxaNoShow:
				totalAppointments30d > 0
					? Math.round((noShowCount / totalAppointments30d) * 100)
					: 0,
			receitaMensal,
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
		};
	}, [
		appointmentsToday,
		appointments30d,
		appointmentsWeek,
		patients,
		therapists,
		contas,
		startCurrentMonthDate,
		startLastMonthDate,
		endLastMonthDate,
		now,
		weekEndDate,
	]);

	const generateSummaryMutation = useMutation({
		mutationFn: async (data: {
			patients: PatientRow[];
			appointments: AppointmentRow[];
		}) => {
			return await generatePatientSummary(data);
		},
		onSuccess: () => {
			toast.success("Insights gerados com sucesso!");
		},
		onError: (error) => {
			logger.error("Error generating summary", { error }, "useSmartDashboard");
			toast.error("Erro ao gerar insights");
		},
	});

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
		isLoadingNotifications;

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
			therapists,
		} as SmartDashboardData,
		mutations: {
			generateSummary: generateSummaryMutation.mutateAsync,
		},
		isLoading,
		refetch: () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
	};
}
