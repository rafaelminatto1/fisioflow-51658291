import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	format,
	parseISO,
	addDays,
	addWeeks,
	startOfDay,
	isBefore,
	isAfter,
} from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useOrganizations } from "@/hooks/useOrganizations";
import { appointmentsApi } from "@/api/v2";

import { useUsePackageSession } from "@/hooks/usePackages";
import {
	type AppointmentBase,
	type AppointmentFormData,
	type RecurringConfig,
} from "@/types/appointment";
import { appointmentFormSchema } from "@/lib/validations/agenda";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { ErrorHandler } from "@/lib/errors/ErrorHandler";
import {
	isAppointmentConflictError,
} from "@/utils/appointmentErrors";
import { checkAppointmentConflict } from "@/utils/appointmentValidation";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import type { DuplicateConfig } from "../DuplicateAppointmentDialog";

interface UseAppointmentFormProps {
	appointment?: AppointmentBase | null;
	defaultDate?: Date;
	defaultTime?: string;
	defaultPatientId?: string;
	onClose: () => void;
	onOpenCapacityDialog: (data: AppointmentFormData, check: any) => void;
	appointments: AppointmentBase[];
	effectiveTherapistId: string;
}

const normalizeTime = (time?: string): string => {
	if (!time) return "";
	const match = String(time)
		.trim()
		.match(/^(\d{1,2}):(\d{2})/);
	if (!match) return String(time).trim();
	return `${match[1].padStart(2, "0")}:${match[2]}`;
};

type AppointmentWithPatientFallback = AppointmentBase & {
	patient_id?: string;
	patient_name?: string;
	patient?: {
		name?: string;
		full_name?: string;
	};
};

const getAppointmentPatientId = (
	appointment?: AppointmentWithPatientFallback | null,
	fallbackPatientId?: string,
) =>
	appointment?.patientId || appointment?.patient_id || fallbackPatientId || "";

export const useAppointmentForm = ({
	appointment,
	defaultDate,
	defaultTime,
	defaultPatientId,
	onClose,
	onOpenCapacityDialog,
	appointments,
	effectiveTherapistId,
}: UseAppointmentFormProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isCreating, setIsCreating] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);

	const { currentOrganization } = useOrganizations();
	const { mutateAsync: consumeSession } = useUsePackageSession();

	const { getMinCapacityForInterval } = useScheduleCapacity();
	const scheduleOnlyRef = useRef(false);
	const appointmentsRef = useRef(appointments);
	appointmentsRef.current = appointments;

	const getInitialFormData = useCallback(
		(
			apt: AppointmentBase | null | undefined,
			defaults: { date?: Date; time?: string; patientId?: string },
		): AppointmentFormData => {
			const normalizedApt = apt as
				| AppointmentWithPatientFallback
				| null
				| undefined;
			let formattedDate = format(new Date(), "yyyy-MM-dd");
			if (apt?.date) {
				if (typeof apt.date === "string") {
					if (/^\d{4}-\d{2}-\d{2}$/.test(apt.date)) {
						formattedDate = apt.date;
					} else {
						formattedDate = format(parseISO(apt.date), "yyyy-MM-dd");
					}
				} else if (apt.date instanceof Date) {
					formattedDate = format(apt.date, "yyyy-MM-dd");
				}
			} else if (defaults.date) {
				formattedDate = format(defaults.date, "yyyy-MM-dd");
			}

			if (apt) {
				return {
					patient_id: getAppointmentPatientId(
						normalizedApt,
						defaults.patientId,
					),
					appointment_date: formattedDate,
					appointment_time: normalizeTime(apt.time || defaults.time || "00:00"),
					duration: apt.duration || 60,
					type: "Fisioterapia",
					status: apt.status || "agendado",
					notes: apt.notes || "",
					therapist_id: apt.therapistId || "",
					room: apt.room || "",
					payment_status: apt.payment_status || "pending",
					payment_amount: apt.payment_amount || 170,
					payment_method: apt.payment_method || "",
					installments: apt.installments || 1,
					is_recurring: apt.is_recurring || false,
					recurring_until: apt.recurring_until
						? format(new Date(apt.recurring_until), "yyyy-MM-dd")
						: "",
					session_package_id: apt.session_package_id || "",
				};
			}

			return {
				patient_id: defaults.patientId || "",
				appointment_date: formattedDate,
				appointment_time: normalizeTime(defaults.time || ""),
				duration: 60,
				type: "Fisioterapia",
				status: "agendado",
				notes: "",
				therapist_id: effectiveTherapistId,
				payment_status: "pending",
				payment_amount: 170,
				payment_method: "",
				installments: 1,
				is_recurring: false,
				recurring_until: "",
				session_package_id: "",
			};
		},
		[],
	);

	const methods = useForm<AppointmentFormData>({
		resolver: zodResolver(appointmentFormSchema),
		defaultValues: getInitialFormData(appointment, {
			date: defaultDate,
			time: defaultTime,
			patientId: defaultPatientId,
		}),
	});

	const buildRecurringDates = useCallback(
		(
			startDate: Date,
			config: RecurringConfig,
		): { date: Date; time: string }[] => {
			if (config.days.length === 0) return [];
			const sorted = [...config.days].sort((a, b) => a.day - b.day);
			const maxSessions = config.endType === "sessions" ? config.sessions : 200;
			const endDate =
				config.endType === "date" && config.endDate
					? parseISO(config.endDate)
					: null;
			const results: { date: Date; time: string }[] = [];
			const startDay = startDate.getDay();
			let weekStart = startOfDay(addDays(startDate, -startDay));
			let weeksChecked = 0;
			while (results.length < maxSessions && weeksChecked < 200) {
				for (const d of sorted) {
					const date = addDays(weekStart, d.day);
					if (isBefore(startOfDay(date), startOfDay(startDate))) continue;
					if (endDate && isAfter(startOfDay(date), startOfDay(endDate)))
						return results;
					results.push({ date, time: d.time });
					if (results.length >= maxSessions) break;
				}
				weekStart = addWeeks(weekStart, 1);
				weeksChecked++;
			}
			return results;
		},
		[],
	);

	const persistAppointment = async (
		appointmentData: AppointmentFormData,
		recurringConfig: RecurringConfig,
		ignoreCapacity: boolean = false,
	) => {
		const endTime = new Date(
			new Date(
				`${appointmentData.appointment_date}T${appointmentData.appointment_time}`,
			).getTime() +
				appointmentData.duration * 60000,
		);
		const endTimeString = format(endTime, "HH:mm");

		let dbPaymentStatus: "pending" | "paid" | "partial" | "overdue" = "pending";
		if (
			appointmentData.payment_status === "paid_single" ||
			appointmentData.payment_status === "paid_package"
		) {
			dbPaymentStatus = "paid";
		} else if (
			appointmentData.payment_status === "pending" ||
			appointmentData.payment_status === "partial" ||
			appointmentData.payment_status === "overdue"
		) {
			dbPaymentStatus = appointmentData.payment_status;
		}

		const formattedData = {
			patient_id: appointmentData.patient_id,
			therapist_id: appointmentData.therapist_id || effectiveTherapistId,
			date: appointmentData.appointment_date,
			start_time: appointmentData.appointment_time,
			end_time: endTimeString,
			status: appointmentData.status as any,
			payment_status: dbPaymentStatus,
			notes: appointmentData.notes || "",
			session_type: (appointmentData.type === "Fisioterapia"
				? "individual"
				: "group") as "individual" | "group",
			session_package_id: appointmentData.session_package_id || null,
			payment_method:
				appointmentData.payment_status === "paid_package"
					? "package"
					: appointmentData.payment_method,
		};

		const appointmentId = appointment?.id;

		if (
			appointmentData.is_recurring &&
			!appointmentId &&
			recurringConfig.days.length > 0
		) {
			const startDate = parseISO(appointmentData.appointment_date);
			const occurrences = buildRecurringDates(startDate, recurringConfig);

			if (occurrences.length === 0) {
				toast({
					variant: "destructive",
					description: "Nenhuma data gerada para a recorrência. Verifique os dias selecionados.",
				});
				return;
			}

			toast({
				title: "Agendamentos recorrentes",
				description: `Criando ${occurrences.length} agendamentos...`,
			});

			setIsCreating(true);
			try {
				for (const occ of occurrences) {
					const occEndTime = new Date(
						new Date(`${format(occ.date, "yyyy-MM-dd")}T${occ.time}`).getTime() +
							appointmentData.duration * 60000,
					);
					await appointmentsApi.create({
						...formattedData,
						organizationId: currentOrganization?.id,
						date: format(occ.date, "yyyy-MM-dd"),
						start_time: occ.time,
						end_time: format(occEndTime, "HH:mm"),
						ignoreCapacity,
					});
				}
				queryClient.invalidateQueries({ queryKey: ["schedule-appointments"] });
			} finally {
				setIsCreating(false);
			}
			scheduleOnlyRef.current = false;
			onClose();
			return;
		}

		if (appointmentId) {
			setIsUpdating(true);
			try {
				await appointmentsApi.update(appointmentId, { 
					...formattedData, 
					organizationId: currentOrganization?.id,
					ignoreCapacity 
				} as any);
				queryClient.invalidateQueries({ queryKey: ["schedule-appointments"] });
			} finally {
				setIsUpdating(false);
			}
		} else {
			setIsCreating(true);
			try {
				await appointmentsApi.create({ 
					...formattedData, 
					organizationId: currentOrganization?.id,
					ignoreCapacity 
				});
				queryClient.invalidateQueries({ queryKey: ["schedule-appointments"] });
			} finally {
				setIsCreating(false);
			}
		}

		// Handle package session debit (this still uses a hook as it's a separate domain logic)
		if (
			appointmentData.session_package_id &&
			appointmentData.payment_status === "paid_package" &&
			["confirmado", "atendido", "concluido"].includes(appointmentData.status)
		) {
			try {
				if (appointmentId) {
					await consumeSession({
						patientPackageId: appointmentData.session_package_id,
						appointmentId: appointmentId,
					});
				}
			} catch (err) {
				logger.error("Error consuming session", err, "useAppointmentForm");
				toast({
					variant: "destructive",
					description: "Erro ao debitar sessão do pacote. Verifique o saldo.",
				});
			}
		}

		if (
			appointmentData.status === "avaliacao" &&
			appointmentId &&
			!scheduleOnlyRef.current
		) {
			const navPath = `/patients/${appointmentData.patient_id}/evaluations/new?appointmentId=${appointmentId}`;
			navigate(navPath);
		}
		scheduleOnlyRef.current = false;
		onClose();
	};

	const handleSave = async (
		data: AppointmentFormData,
		recurringConfig: RecurringConfig,
	) => {
		const normalizedData: AppointmentFormData = {
			...data,
			appointment_time: normalizeTime(data.appointment_time),
			type: "Fisioterapia",
		};

		if (!normalizedData.appointment_time) {
			toast({
				variant: "destructive",
				description: "Horário do agendamento é obrigatório",
			});
			return;
		}

		if (!normalizedData.patient_id) {
			toast({
				variant: "destructive",
				description: "ID do paciente é obrigatório",
			});
			return;
		}

		if (!normalizedData.appointment_date) {
			toast({
				variant: "destructive",
				description: "Data do agendamento é obrigatória",
			});
			return;
		}

		const selectedDate = parseISO(normalizedData.appointment_date);
		const selectedTime = normalizedData.appointment_time;
		const selectedDuration = normalizedData.duration || 60;

		const freshConflictCheck = checkAppointmentConflict({
			date: selectedDate,
			time: selectedTime,
			duration: selectedDuration,
			excludeId: appointment?.id,
			therapistId: effectiveTherapistId,
			appointments: appointmentsRef.current,
		});

		const maxCapacity = getMinCapacityForInterval(
			selectedDate.getDay(),
			selectedTime,
			selectedDuration,
		);
		const currentCount = freshConflictCheck.totalConflictCount || 0;

		if (currentCount >= maxCapacity) {
			onOpenCapacityDialog(normalizedData, freshConflictCheck);
			return;
		}

		try {
			await persistAppointment(normalizedData, recurringConfig);
		} catch (error: unknown) {
			if (isAppointmentConflictError(error)) {
				onOpenCapacityDialog(normalizedData, freshConflictCheck);
				ErrorHandler.handle(error, "useAppointmentForm:handleSave", {
					showNotification: false,
				});
			} else {
				ErrorHandler.handle(error, "useAppointmentForm:handleSave");
			}
		}
	};

	const handleDelete = async () => {
		if (appointment?.id) {
			try {
				await appointmentsApi.cancel(appointment.id);
				queryClient.invalidateQueries({ queryKey: ["appointments"] });
			} catch (err) {
				logger.error("Error deleting appointment", err, "useAppointmentForm");
				toast({ variant: "destructive", description: "Erro ao excluir agendamento." });
			}
			onClose();
		}
	};

	const handleDuplicate = async (config: DuplicateConfig) => {
		if (appointment && config.dates.length > 0) {
			try {
				for (const date of config.dates) {
					const newTime = config.newTime || appointment.time;
					const newDate = format(date, "yyyy-MM-dd");
					const duration = appointment.duration || 60;
					const endTime = new Date(
						new Date(`${newDate}T${newTime}`).getTime() + duration * 60000,
					);
					const endTimeString = format(endTime, "HH:mm");

					const duplicateData = {
						patient_id: appointment.patientId,
						therapist_id: appointment.therapistId || null,
						date: newDate,
						start_time: newTime,
						end_time: endTimeString,
						status: appointment.status,
						payment_status: appointment.payment_status || "pending",
						notes: appointment.notes || "",
						session_type: (appointment.type === "Fisioterapia"
							? "individual"
							: "group") as "individual" | "group",
					};

					await appointmentsApi.create(duplicateData);
				}

				queryClient.invalidateQueries({ queryKey: ["appointments"] });
				toast({
					title: "Agendamentos duplicados",
					description: `${config.dates.length} agendamento(s) duplicado(s) com sucesso.`,
				});
			} catch (err) {
				logger.error("Error duplicating appointment", err, "useAppointmentForm");
				toast({
					variant: "destructive",
					description: "Erro ao duplicar agendamento(s).",
				});
			}
		}
	};

	return {
		methods,
		isCreating,
		isUpdating,
		handleSave,
		handleDelete,
		handleDuplicate,
		persistAppointment,
		scheduleOnlyRef,
		getInitialFormData,
	};
};
