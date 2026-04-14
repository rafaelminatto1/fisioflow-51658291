import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import type { Appointment } from "@/types";
import {
	getAppointments,
	getAppointmentById,
	createAppointment,
	updateAppointment,
	cancelAppointment,
	type ApiAppointment,
} from "@/lib/api";

export interface UseAppointmentsOptions {
	startDate?: Date;
	endDate?: Date;
	status?: string;
	limit?: number;
	patientId?: string;
	refetchInterval?: number | false;
	initialData?: any[];
}

// Map API appointment type to app Appointment type
function mapAppointmentType(type?: string): string {
	switch ((type || "").toLowerCase()) {
		case "evaluation":
			return "Avaliação Inicial";
		case "reassessment":
			return "Reavaliação";
		case "group":
			return "Grupo";
		case "return":
			return "Retorno";
		case "session":
			return "Fisioterapia";
		default:
			return type || "Fisioterapia";
	}
}

function mapApiAppointment(apiAppointment: ApiAppointment): Appointment {
	// Parse date (can be YYYY-MM-DD or ISO string)
	let appointmentDate: Date;
	try {
		if (apiAppointment.date.includes("T")) {
			appointmentDate = new Date(apiAppointment.date);
		} else {
			const [year, month, day] = apiAppointment.date.split("-").map(Number);
			appointmentDate = new Date(year, month - 1, day);
		}

		// Add time component if available
		const startTime = apiAppointment.startTime || apiAppointment.start_time;
		if (startTime) {
			const [hours, minutes] = startTime.split(":").map(Number);
			appointmentDate.setHours(hours, minutes, 0, 0);
		}
	} catch {
		appointmentDate = new Date();
	}

	// Filter out "grupo" from patient name
	const patientName = apiAppointment.patient_name || "";
	const cleanPatientName =
		patientName === "grupo" || patientName === "Grupo" ? "" : patientName;

	return {
		id: apiAppointment.id,
		patientId: apiAppointment.patientId || apiAppointment.patient_id || "",
		patientName: cleanPatientName,
		professionalId:
			apiAppointment.therapistId || apiAppointment.therapist_id || "",
		clinicId: undefined,
		date: appointmentDate,
		time: apiAppointment.startTime || apiAppointment.start_time,
		duration: parseDuration(
			apiAppointment.startTime || apiAppointment.start_time || "00:00",
			apiAppointment.endTime || apiAppointment.end_time || "00:00",
		),
		type: mapAppointmentType(
			apiAppointment.type || apiAppointment.session_type,
		),
		status: mapAppointmentStatus(apiAppointment.status),
		notes: apiAppointment.notes,
		isGroup: apiAppointment.isGroup ?? apiAppointment.is_group ?? false,
		additionalNames:
			apiAppointment.additionalNames ?? apiAppointment.additional_names ?? "",
		isUnlimited:
			apiAppointment.isUnlimited ?? apiAppointment.is_unlimited ?? false,
		createdAt: apiAppointment.created_at || appointmentDate,
		updatedAt: apiAppointment.updated_at || appointmentDate,
	};
}

function parseDuration(startTime: string, endTime: string): number {
	try {
		const [startH, startM] = startTime.split(":").map(Number);
		const [endH, endM] = endTime.split(":").map(Number);
		return endH * 60 + endM - (startH * 60 + startM);
	} catch {
		return 45; // default duration
	}
}

function mapAppointmentStatus(status: string): Appointment["status"] {
	const statusMap: Record<string, Appointment["status"]> = {
		scheduled: "scheduled",
		agendado: "scheduled",
		confirmed: "confirmed",
		confirmado: "confirmed",
		presenca_confirmada: "confirmed",
		in_progress: "in_progress",
		em_andamento: "in_progress",
		em_atendimento: "in_progress",
		completed: "completed",
		concluido: "completed",
		atendido: "completed",
		cancelled: "cancelled",
		cancelado: "cancelled",
		no_show: "no_show",
		faltou: "no_show",
		remarcar: "scheduled",
		avaliacao: "scheduled",
	};
	return statusMap[status] || "scheduled";
}

function mapToApiStatus(status: Appointment["status"]): string {
	const statusMap: Record<string, string> = {
		scheduled: "agendado",
		confirmed: "presenca_confirmada",
		in_progress: "presenca_confirmada",
		completed: "atendido",
		cancelled: "cancelado",
		no_show: "faltou",
	};
	return statusMap[status] || "agendado";
}

// Format Date to YYYY-MM-DD
function formatDateForAPI(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Add minutes to HH:MM time string
function addMinutesToTime(time: string, minutes: number): string {
	const [h, m] = time.split(":").map(Number);
	const totalMinutes = h * 60 + m + minutes;
	const newH = Math.floor(totalMinutes / 60) % 24;
	const newM = totalMinutes % 60;
	return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function parseLocalDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(year, month - 1, day);
}

export function useAppointments(options?: UseAppointmentsOptions) {
	const { user } = useAuthStore();
	const queryClient = useQueryClient();

	const dateFromStr = options?.startDate
		? formatDateForAPI(options.startDate)
		: undefined;
	const dateToStr = options?.endDate
		? formatDateForAPI(options.endDate)
		: undefined;

	const appointments = useQuery({
		queryKey: [
			"appointments_v2",
			user?.id,
			dateFromStr,
			dateToStr,
			options?.status,
			options?.patientId,
			options?.limit,
		],
		queryFn: async () => {
			if (!user?.id) {
				return [];
			}

			// Map frontend status (e.g. 'scheduled') to backend status (e.g. 'agendado')
			const statusParam = options?.status
				? mapToApiStatus(options.status as any)
				: undefined;

			try {
				const data = await getAppointments(user.organizationId, {
					dateFrom: dateFromStr,
					dateTo: dateToStr,
					therapistId: user.id,
					status: statusParam,
					patientId: options?.patientId,
					limit: options?.limit || 100,
				});
				const mapped = data.map(mapApiAppointment);
				return mapped;
			} catch (error) {
				console.error("[useAppointments] Error:", error);
				throw error;
			}
		},
		enabled: !!user,
		staleTime: 1000 * 60 * 2, // 2 minutes
		refetchInterval: options?.refetchInterval,
		refetchOnWindowFocus: true,
	});

	const createMutation = useMutation({
		mutationFn: async (
			data: Omit<Appointment, "id" | "createdAt" | "updatedAt">,
		) => {
			if (!user?.id) throw new Error("User not authenticated");

			const dateStr =
				typeof data.date === "string"
					? data.date
					: formatDateForAPI(new Date(data.date));
			const startTime = data.time || "09:00";
			const endTime = addMinutesToTime(startTime, data.duration);

			const apiAppointment = await createAppointment({
				patientId: data.patientId,
				date: dateStr,
				startTime,
				endTime,
				therapistId: user.id,
				organizationId: user.organizationId,
				type: data.type,
				notes: data.notes,
				isGroup: data.isGroup,
				additionalNames: data.additionalNames,
				isUnlimited: data.isUnlimited,
			});

			return mapApiAppointment(apiAppointment);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["appointments_v2"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<Appointment>;
		}) => {
			const updateData: Partial<ApiAppointment> = {};

			if (data.patientId) updateData.patientId = data.patientId;
			if (data.type) updateData.type = data.type;
			if (data.notes !== undefined) updateData.notes = data.notes;
			if (data.status) updateData.status = mapToApiStatus(data.status);
			if (data.isGroup !== undefined)
				(updateData as any).isGroup = data.isGroup;
			if (data.additionalNames !== undefined)
				(updateData as any).additionalNames = data.additionalNames;
			if (data.isUnlimited !== undefined)
				(updateData as any).isUnlimited = data.isUnlimited;

			if (data.date || data.time || data.duration) {
				let dateObj: Date;
				if (data.date) {
					if (typeof data.date === "string" && data.date.includes("-")) {
						dateObj = parseLocalDate(data.date);
					} else {
						dateObj = new Date(data.date);
					}
				} else {
					dateObj = new Date();
				}

				updateData.date = formatDateForAPI(dateObj);
				const time = data.time || "09:00";
				updateData.startTime = time;
				updateData.endTime = addMinutesToTime(time, data.duration || 45);
			}

			const apiAppointment = await updateAppointment(id, updateData);
			return mapApiAppointment(apiAppointment);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["appointments_v2"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => cancelAppointment(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["appointments_v2"] });
		},
	});

	return {
		data: appointments.data || [],
		isLoading: appointments.isLoading,
		error: appointments.error,
		refetch: appointments.refetch,
		create: createMutation.mutate,
		createAsync: createMutation.mutateAsync,
		update: updateMutation.mutate,
		updateAsync: updateMutation.mutateAsync,
		delete: deleteMutation.mutate,
		deleteAsync: deleteMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
}

// Additional function to get a single appointment
export async function getAppointmentByIdHook(
	id: string,
): Promise<Appointment | null> {
	try {
		const apiAppointment = await getAppointmentById(id);
		return apiAppointment ? mapApiAppointment(apiAppointment) : null;
	} catch {
		return null;
	}
}
