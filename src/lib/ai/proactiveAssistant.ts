import { differenceInDays, addDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { appointmentsApi, financialApi, patientsApi } from "@/api/v2";

export interface ProactiveSuggestion {
	id: string;
	type:
		| "no-show-alert"
		| "schedule-optimization"
		| "inventory-alert"
		| "retention-warning"
		| "appointment-gap";
	priority: "low" | "medium" | "high" | "urgent";
	title: string;
	description: string;
	actionLabel?: string;
	actionUrl?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
}

export interface ScheduleSuggestion {
	date: Date;
	timeSlots: Array<{
		start: string;
		end: string;
		availability: "high" | "medium" | "low";
	}>;
	recommendedFor?: string[];
	reason: string;
}

export interface InventoryAlert {
	itemName: string;
	currentStock: number;
	projectedStock: number;
	reorderThreshold: number;
	daysUntilStockout: number;
	suggestedOrderQuantity: number;
}

export async function generateProactiveSuggestions(
	_organizationId: string,
	options?: {
		includeNoShows?: boolean;
		includeScheduleOptimization?: boolean;
		includeInventoryAlerts?: boolean;
		includeRetentionWarnings?: boolean;
		daysAhead?: number;
	},
): Promise<ProactiveSuggestion[]> {
	const suggestions: ProactiveSuggestion[] = [];
	const opts = {
		includeNoShows: true,
		includeScheduleOptimization: true,
		includeInventoryAlerts: true,
		includeRetentionWarnings: true,
		daysAhead: 14,
		...options,
	};

	if (opts.includeNoShows) suggestions.push(...(await generateNoShowAlerts()));
	if (opts.includeScheduleOptimization)
		suggestions.push(...(await generateScheduleOptimization(opts.daysAhead)));
	if (opts.includeRetentionWarnings)
		suggestions.push(...(await generateRetentionWarnings()));
	if (opts.includeInventoryAlerts)
		suggestions.push(...(await generateInventoryAlerts()));

	const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
	return suggestions
		.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
		.slice(0, 10);
}

async function generateNoShowAlerts(): Promise<ProactiveSuggestion[]> {
	const tomorrow = addDays(new Date(), 1).toISOString();
	const threeDaysLater = addDays(new Date(), 3).toISOString();
	const upcoming =
		(
			await appointmentsApi.list({
				dateFrom: tomorrow,
				dateTo: threeDaysLater,
				status: "agendado",
				limit: 100,
			})
		).data ?? [];
	const suggestions: ProactiveSuggestion[] = [];

	for (const appointment of upcoming) {
		if (!appointment.patient_id) continue;
		const noShows =
			(
				await appointmentsApi.list({
					patientId: appointment.patient_id,
					status: "falta",
					limit: 5,
				})
			).data ?? [];
		const latestAppointments =
			(
				await appointmentsApi.list({
					patientId: appointment.patient_id,
					limit: 1,
				})
			).data ?? [];
		const lastWasNoShow = latestAppointments[0]?.status === "falta";
		if (!lastWasNoShow && noShows.length < 3) continue;

		suggestions.push({
			id: `noshow-${appointment.id}`,
			type: "no-show-alert",
			priority: lastWasNoShow ? "urgent" : "high",
			title: "Risco de não comparecimento",
			description: `${appointment.patient_name ?? "Paciente"} tem ${noShows.length} faltas${lastWasNoShow ? " e faltou à última consulta" : ""}. Considere confirmar o agendamento de ${format(new Date(appointment.date || appointment.start_time), "dd/MM/yyyy", { locale: ptBR })}.`,
			actionLabel: "Entrar em Contato",
			actionUrl: appointment.patient_id
				? `/pacientes/${appointment.patient_id}`
				: "/agenda",
			metadata: {
				patientId: appointment.patient_id,
				appointmentId: appointment.id,
				noShowCount: noShows.length,
				lastWasNoShow,
			},
			createdAt: new Date(),
		});
	}

	return suggestions;
}

async function generateScheduleOptimization(
	daysAhead = 14,
): Promise<ProactiveSuggestion[]> {
	const startDate = new Date();
	const endDate = addDays(startDate, daysAhead);
	const appointments =
		(
			await appointmentsApi.list({
				dateFrom: startDate.toISOString(),
				dateTo: endDate.toISOString(),
				limit: 500,
			})
		).data ?? [];

	const grouped = new Map<string, typeof appointments>();
	appointments.forEach((appointment) => {
		const key = (appointment.date || appointment.start_time || "").slice(0, 10);
		if (!key) return;
		const list = grouped.get(key) ?? [];
		list.push(appointment);
		grouped.set(key, list);
	});

	const suggestions: ProactiveSuggestion[] = [];
	for (const [date, dayAppointments] of grouped.entries()) {
		const hourCounts = new Map<number, number>();
		dayAppointments.forEach((appointment) => {
			const hour = Number((appointment.start_time || "00:00").split(":")[0]);
			hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
		});
		const workingHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
		let maxConcurrent = 0;
		let minConcurrent = Infinity;
		workingHours.forEach((hour) => {
			const count = hourCounts.get(hour) || 0;
			maxConcurrent = Math.max(maxConcurrent, count);
			minConcurrent = Math.min(minConcurrent, count);
		});
		if (
			maxConcurrent > 0 &&
			minConcurrent < maxConcurrent / 3 &&
			maxConcurrent >= 2
		) {
			const quietHours = workingHours.filter(
				(hour) => (hourCounts.get(hour) || 0) <= minConcurrent + 1,
			);
			suggestions.push({
				id: `schedule-gap-${date}`,
				type: "schedule-optimization",
				priority: "medium",
				title: "Horário disponível detectado",
				description: `O dia ${format(new Date(date), "dd/MM MMM", { locale: ptBR })} tem baixa ocupação entre ${Math.min(...quietHours)}:00 e ${Math.max(...quietHours) + 1}:00.`,
				actionLabel: "Ver Agenda",
				actionUrl: "/agenda",
				metadata: {
					date,
					quietHours,
					appointmentCount: dayAppointments.length,
				},
				createdAt: new Date(),
			});
		}
	}
	return suggestions;
}

async function generateRetentionWarnings(): Promise<ProactiveSuggestion[]> {
	const recentCutoff = subDays(new Date(), 45);
	const patients = (await patientsApi.list({ limit: 300 })).data ?? [];
	const recentAppointments =
		(
			await appointmentsApi.list({
				dateFrom: recentCutoff.toISOString(),
				limit: 500,
			})
		).data ?? [];
	const activePatients = new Set(
		recentAppointments
			.map((appointment) => appointment.patient_id)
			.filter(Boolean),
	);

	return patients
		.filter((patient) => !activePatients.has(patient.id))
		.slice(0, 10)
		.map((patient) => ({
			id: `retention-${patient.id}`,
			type: "retention-warning",
			priority: "medium",
			title: "Paciente sem retorno recente",
			description: `${patient.full_name ?? patient.name ?? "Paciente"} não aparece em atendimentos recentes. Vale acionar retorno ou follow-up.`,
			actionLabel: "Abrir paciente",
			actionUrl: `/pacientes/${patient.id}`,
			metadata: { patientId: patient.id },
			createdAt: new Date(),
		}));
}

async function generateInventoryAlerts(): Promise<ProactiveSuggestion[]> {
	const items =
		(await financialApi.inventory.list({ activeOnly: true })).data ?? [];
	return items
		.filter((item) => item.current_quantity <= item.minimum_quantity)
		.slice(0, 5)
		.map((item) => ({
			id: `inventory-${item.id}`,
			type: "inventory-alert",
			priority: item.current_quantity === 0 ? "urgent" : "high",
			title: "Item com estoque baixo",
			description: `${item.item_name} está com ${item.current_quantity} ${item.unit}(s), abaixo do mínimo de ${item.minimum_quantity}.`,
			actionLabel: "Ver estoque",
			actionUrl: "/financeiro",
			metadata: { inventoryId: item.id },
			createdAt: new Date(),
		}));
}

export function calculatePatientRetentionRate(
	lastVisitDate?: string | null,
): number {
	if (!lastVisitDate) return 0;
	const days = differenceInDays(new Date(), new Date(lastVisitDate));
	if (days <= 30) return 100;
	if (days <= 60) return 70;
	if (days <= 90) return 40;
	return 10;
}
