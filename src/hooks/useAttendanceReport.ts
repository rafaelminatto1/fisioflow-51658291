/**
 * useAttendanceReport - Migrated to Neon/Workers
 */

import { useQuery } from "@tanstack/react-query";
import {
	format,
	startOfDay,
	endOfDay,
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	startOfQuarter,
	endOfQuarter,
	startOfYear,
	endOfYear,
	subMonths,
	getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	appointmentsApi,
	profileApi,
	type AppointmentRow,
} from "@/api/v2";

export type PeriodFilter = "week" | "month" | "quarter" | "year" | "custom";
export type StatusFilter =
	| "all"
	| "atendido"
	| "faltou"
	| "cancelado"
	| "presenca_confirmada";

interface AttendanceFilters {
	period: PeriodFilter;
	therapistId?: string;
	status?: StatusFilter;
	startDate?: Date;
	endDate?: Date;
}

interface TherapistAttendance {
	id: string;
	name: string;
	total: number;
	attended: number;
	noShow: number;
	cancelled: number;
	rate: number;
}

interface DayOfWeekData {
	day: string;
	dayIndex: number;
	total: number;
	attended: number;
	noShow: number;
	cancelled: number;
	attendanceRate: number;
	noShowRate: number;
}

interface MonthlyEvolution {
	month: string;
	attendanceRate: number;
	total: number;
}

interface HourlyAnalysis {
	hour: string;
	total: number;
	noShow: number;
	noShowRate: number;
}

interface AppointmentDetail {
	id: string;
	patientName: string;
	patientPhone?: string;
	date: string;
	time: string;
	therapistName: string;
	status: string;
	notes?: string;
}

interface Insight {
	type: "success" | "warning" | "info";
	message: string;
}

export interface AttendanceMetrics {
	totalAppointments: number;
	attended: number;
	noShow: number;
	cancelled: number;
	attendanceRate: number;
	cancellationRate: number;
	noShowRate: number;
	pieChartData: { name: string; value: number; color: string }[];
	dayOfWeekData: DayOfWeekData[];
	monthlyEvolution: MonthlyEvolution[];
	therapistData: TherapistAttendance[];
	hourlyAnalysis: HourlyAnalysis[];
	appointments: AppointmentDetail[];
	insights: Insight[];
}

const DAYS_OF_WEEK = [
	"Domingo",
	"Segunda",
	"Terça",
	"Quarta",
	"Quinta",
	"Sexta",
	"Sábado",
];

function normalizeStatus(status: unknown): string {
	const raw = String(status ?? "").toLowerCase();
	const map: Record<string, string> = {
		atendido: "atendido",
		concluido: "atendido",
		completed: "atendido",
		realizado: "atendido",

		faltou: "faltou",
		falta: "faltou",
		paciente_faltou: "faltou",
		no_show: "faltou",
		faltou_com_aviso: "faltou",
		faltou_sem_aviso: "faltou",

		cancelado: "cancelado",
		cancelled: "cancelado",

		confirmado: "presenca_confirmada",
		confirmed: "presenca_confirmada",
		presenca_confirmada: "presenca_confirmada",

		agendado: "agendado",
		scheduled: "agendado",

		remarcar: "cancelado",
		remarcado: "cancelado",
		reagendado: "cancelado",

		em_atendimento: "atendido",
		in_progress: "atendido",
	};
	return map[raw] ?? "agendado";
}

function parseDate(date: string): Date {
	return new Date(`${date}T12:00:00`);
}

const getDateRange = (
	period: PeriodFilter,
	startDate?: Date,
	endDate?: Date,
) => {
	const today = new Date();

	switch (period) {
		case "week":
			return {
				start: startOfWeek(today, { weekStartsOn: 1 }),
				end: endOfWeek(today, { weekStartsOn: 1 }),
			};
		case "month":
			return { start: startOfMonth(today), end: endOfMonth(today) };
		case "quarter":
			return { start: startOfQuarter(today), end: endOfQuarter(today) };
		case "year":
			return { start: startOfYear(today), end: endOfYear(today) };
		case "custom":
			return {
				start: startDate ? startOfDay(startDate) : startOfMonth(today),
				end: endDate ? endOfDay(endDate) : endOfMonth(today),
			};
		default:
			return { start: startOfMonth(today), end: endOfMonth(today) };
	}
};

async function listAppointmentsPaginated(params: {
	dateFrom: string;
	dateTo: string;
	therapistId?: string;
}): Promise<AppointmentRow[]> {
	const pageSize = 1000;
	let offset = 0;
	let guard = 0;
	const all: AppointmentRow[] = [];

	while (guard < 30) {
		const res = await appointmentsApi.list({
			dateFrom: params.dateFrom,
			dateTo: params.dateTo,
			therapistId: params.therapistId,
			limit: pageSize,
			offset,
		});

		const chunk = (res?.data ?? []) as AppointmentRow[];
		all.push(...chunk);

		if (chunk.length < pageSize) break;
		offset += pageSize;
		guard += 1;
	}

	return all;
}

export const useAttendanceReport = (
	filters: AttendanceFilters = { period: "month" },
) => {
	return useQuery({
		queryKey: [
			"attendance-report",
			filters.period,
			filters.therapistId,
			filters.status,
			filters.startDate?.toISOString(),
			filters.endDate?.toISOString(),
		],
		queryFn: async (): Promise<AttendanceMetrics> => {
			const { start, end } = getDateRange(
				filters.period,
				filters.startDate,
				filters.endDate,
			);
			const startDateStr = format(start, "yyyy-MM-dd");
			const endDateStr = format(end, "yyyy-MM-dd");

			const appointmentsRaw = await listAppointmentsPaginated({
				dateFrom: startDateStr,
				dateTo: endDateStr,
				therapistId:
					filters.therapistId && filters.therapistId !== "all"
						? filters.therapistId
						: undefined,
			});

			const appointments = appointmentsRaw
				.map((row) => ({
					...row,
					normalizedStatus: normalizeStatus(row.status),
					appointment_date: row.date,
					appointment_time: row.start_time,
				}))
				.filter((row) => {
					if (!filters.status || filters.status === "all") return true;
					return row.normalizedStatus === filters.status;
				});

			const therapistsRes = await profileApi.listTherapists();
			const therapistMap = new Map<string, string>(
				(
					(therapistsRes?.data ?? []) as Array<{ id: string; name: string }>
				).map((t) => [String(t.id), String(t.name)]),
			);

			const total = appointments.length;
			const attended = appointments.filter(
				(a) => a.normalizedStatus === "atendido",
			).length;
			const noShow = appointments.filter(
				(a) => a.normalizedStatus === "faltou",
			).length;
			const cancelled = appointments.filter(
				(a) => a.normalizedStatus === "cancelado",
			).length;

			const attendanceRate =
				total > 0 ? Math.round((attended / total) * 100) : 0;
			const cancellationRate =
				total > 0 ? Math.round((cancelled / total) * 100) : 0;
			const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

			const pieChartData = [
				{ name: "Atendido", value: attended, color: "hsl(142, 76%, 36%)" },
				{ name: "Faltou", value: noShow, color: "hsl(0, 84%, 60%)" },
				{ name: "Cancelado", value: cancelled, color: "hsl(45, 93%, 47%)" },
			].filter((d) => d.value > 0);

			const dayOfWeekMap = new Map<
				number,
				{ total: number; attended: number; noShow: number; cancelled: number }
			>();
			for (let i = 0; i < 7; i += 1) {
				dayOfWeekMap.set(i, { total: 0, attended: 0, noShow: 0, cancelled: 0 });
			}

			appointments.forEach((apt) => {
				const dayIndex = getDay(parseDate(apt.appointment_date));
				const dayData = dayOfWeekMap.get(dayIndex)!;
				dayData.total += 1;
				if (apt.normalizedStatus === "atendido") dayData.attended += 1;
				if (apt.normalizedStatus === "faltou") dayData.noShow += 1;
				if (apt.normalizedStatus === "cancelado") dayData.cancelled += 1;
			});

			const dayOfWeekData: DayOfWeekData[] = Array.from(dayOfWeekMap.entries())
				.map(([dayIndex, data]) => ({
					day: DAYS_OF_WEEK[dayIndex],
					dayIndex,
					...data,
					attendanceRate:
						data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
					noShowRate:
						data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0,
				}))
				.sort(
					(a, b) =>
						(a.dayIndex === 0 ? 7 : a.dayIndex) -
						(b.dayIndex === 0 ? 7 : b.dayIndex),
				);

			const monthlyEvolution: MonthlyEvolution[] = [];
			for (let i = 5; i >= 0; i -= 1) {
				const monthDate = subMonths(new Date(), i);
				const monthStart = startOfMonth(monthDate);
				const monthEnd = endOfMonth(monthDate);

				const monthAppointments = appointments.filter((apt) => {
					const aptDate = parseDate(apt.appointment_date);
					return aptDate >= monthStart && aptDate <= monthEnd;
				});

				const monthTotal = monthAppointments.length;
				const monthAttended = monthAppointments.filter(
					(a) => a.normalizedStatus === "atendido",
				).length;

				monthlyEvolution.push({
					month: format(monthDate, "MMM", { locale: ptBR }),
					attendanceRate:
						monthTotal > 0 ? Math.round((monthAttended / monthTotal) * 100) : 0,
					total: monthTotal,
				});
			}

			const therapistStats = new Map<string, TherapistAttendance>();
			appointments.forEach((apt) => {
				const therapistId = apt.therapist_id || "unknown";
				const therapistName = therapistMap.get(therapistId) || "Não atribuído";

				if (!therapistStats.has(therapistId)) {
					therapistStats.set(therapistId, {
						id: therapistId,
						name: therapistName,
						total: 0,
						attended: 0,
						noShow: 0,
						cancelled: 0,
						rate: 0,
					});
				}

				const data = therapistStats.get(therapistId)!;
				data.total += 1;
				if (apt.normalizedStatus === "atendido") data.attended += 1;
				if (apt.normalizedStatus === "faltou") data.noShow += 1;
				if (apt.normalizedStatus === "cancelado") data.cancelled += 1;
			});

			const therapistData = Array.from(therapistStats.values())
				.map((t) => ({
					...t,
					rate: t.total > 0 ? Math.round((t.attended / t.total) * 100) : 0,
				}))
				.sort((a, b) => b.rate - a.rate);

			const hourlyMap = new Map<number, { total: number; noShow: number }>();
			for (let h = 7; h <= 21; h += 1) {
				hourlyMap.set(h, { total: 0, noShow: 0 });
			}

			appointments.forEach((apt) => {
				const hour = Number(
					String(apt.appointment_time ?? "0:00").split(":")[0],
				);
				if (hourlyMap.has(hour)) {
					const row = hourlyMap.get(hour)!;
					row.total += 1;
					if (apt.normalizedStatus === "faltou") row.noShow += 1;
				}
			});

			const hourlyAnalysis: HourlyAnalysis[] = Array.from(hourlyMap.entries())
				.map(([hour, data]) => ({
					hour: `${hour.toString().padStart(2, "0")}h`,
					total: data.total,
					noShow: data.noShow,
					noShowRate:
						data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0,
				}))
				.filter((h) => h.total > 0);

			const appointmentDetails: AppointmentDetail[] = appointments
				.map((apt) => ({
					id: apt.id,
					patientName: apt.patient_name || "Paciente",
					patientPhone: apt.patient_phone || undefined,
					date: apt.appointment_date,
					time: apt.appointment_time,
					therapistName:
						therapistMap.get(apt.therapist_id || "") || "Não atribuído",
					status: apt.normalizedStatus,
					notes: apt.notes || undefined,
				}))
				.sort(
					(a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime(),
				);

			const insights: Insight[] = [];

			if (therapistData.length > 0 && therapistData[0].rate >= 90) {
				insights.push({
					type: "success",
					message: `${therapistData[0].name} tem ${therapistData[0].rate}% de comparecimento.`,
				});
			}

			const worstDay = dayOfWeekData
				.filter((d) => d.total >= 3)
				.sort((a, b) => b.noShowRate - a.noShowRate)[0];
			if (worstDay && worstDay.noShowRate >= 15) {
				insights.push({
					type: "warning",
					message: `Maior taxa de faltas em ${worstDay.day.toLowerCase()}: ${worstDay.noShowRate}%.`,
				});
			}

			const worstHour = hourlyAnalysis
				.filter((h) => h.total >= 3)
				.sort((a, b) => b.noShowRate - a.noShowRate)[0];
			if (worstHour && worstHour.noShowRate >= 15) {
				insights.push({
					type: "warning",
					message: `Horário com maior falta: ${worstHour.hour} (${worstHour.noShowRate}%).`,
				});
			}

			if (attendanceRate >= 90) {
				insights.push({
					type: "success",
					message: `Taxa geral de comparecimento de ${attendanceRate}%.`,
				});
			} else if (attendanceRate < 70) {
				insights.push({
					type: "warning",
					message: `Taxa de comparecimento de ${attendanceRate}% abaixo do ideal.`,
				});
			}

			return {
				totalAppointments: total,
				attended,
				noShow,
				cancelled,
				attendanceRate,
				cancellationRate,
				noShowRate,
				pieChartData,
				dayOfWeekData,
				monthlyEvolution,
				therapistData,
				hourlyAnalysis,
				appointments: appointmentDetails,
				insights,
			};
		},
		refetchInterval: 60000,
	});
};

export const useTherapists = () => {
	return useQuery({
		queryKey: ["therapists-list"],
		queryFn: async () => {
			const res = await profileApi.listTherapists();
			return ((res?.data ?? []) as Array<{ id: string; name: string }>).map(
				(t) => ({
					id: t.id,
					full_name: t.name,
				}),
			);
		},
	});
};
