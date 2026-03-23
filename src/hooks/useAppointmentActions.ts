import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUpdateAppointmentStatus, appointmentKeys } from "./useAppointments";
import { useMutation } from "@tanstack/react-query";
import { AppointmentService } from "@/services/appointmentService";
import { ErrorHandler } from "@/lib/errors/ErrorHandler";
import { appointmentPeriodKeys } from "./useAppointmentsByPeriod";
import { AppointmentStatus } from "@/types/appointment";
import {
	triggerHapticImpact,
	type HapticImpactStyle,
} from "@/lib/platform/native";

const triggerHaptic = async (style: HapticImpactStyle = "light") => {
	try {
		await triggerHapticImpact(style);
	} catch (e) {
		// Ignore if not on device
	}
};

export const useAppointmentActions = () => {
	const queryClient = useQueryClient();
	const updateStatusMutation = useUpdateAppointmentStatus();

	const confirmAppointment = useMutation({
		mutationFn: async (appointmentId: string) => {
			await AppointmentService.updateStatus(
				appointmentId,
				"presenca_confirmada",
			);
		},
		onSuccess: () => {
			triggerHaptic("medium");
			queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
			queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
			toast.success("Presença confirmada com sucesso");
		},
		onError: (error: Error) => {
			ErrorHandler.handle(error, "useAppointmentActions.confirm");
		},
	});

	const cancelAppointment = useMutation({
		mutationFn: async ({
			appointmentId,
			reason,
		}: {
			appointmentId: string;
			reason?: string;
		}) => {
			await AppointmentService.cancelAppointment(appointmentId, reason);
		},
		onSuccess: () => {
			triggerHaptic("heavy");
			queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
			queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
			toast.success("Agendamento cancelado");
		},
		onError: (error: Error) => {
			ErrorHandler.handle(error, "useAppointmentActions.cancel");
		},
	});

	const rescheduleAppointment = useMutation({
		mutationFn: async ({
			appointmentId,
			newDate,
			newTime,
		}: {
			appointmentId: string;
			newDate: string;
			newTime: string;
		}) => {
			const { getUserOrganizationId } = await import("@/utils/userHelpers");
			const organizationId = await getUserOrganizationId();

			return await AppointmentService.updateAppointment(
				appointmentId,
				{
					appointment_date: newDate,
					appointment_time: newTime,
					status: "remarcar",
				},
				organizationId,
			);
		},
		onSuccess: () => {
			triggerHaptic("medium");
			queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
			queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
			toast.success("Agendamento remarcado com sucesso");
		},
		onError: (error: Error) => {
			ErrorHandler.handle(error, "useAppointmentActions.reschedule");
		},
	});

	const completeAppointment = useMutation({
		mutationFn: async (appointmentId: string) => {
			await AppointmentService.updateStatus(appointmentId, "atendido");
		},
		onSuccess: () => {
			triggerHaptic("light");
			queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
			queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
			toast.success("Consulta marcada como atendida");
		},
		onError: (error: Error) => {
			ErrorHandler.handle(error, "useAppointmentActions.complete");
		},
	});

	return {
		confirmAppointment: confirmAppointment.mutate,
		cancelAppointment: cancelAppointment.mutate,
		rescheduleAppointment: rescheduleAppointment.mutate,
		completeAppointment: completeAppointment.mutate,
		updateStatus: (params: { appointmentId: string; status: string }) => {
			return updateStatusMutation.mutate({
				appointmentId: params.appointmentId,
				status: params.status as AppointmentStatus,
			});
		},
		isConfirming: confirmAppointment.isPending,
		isCanceling: cancelAppointment.isPending,
		isRescheduling: rescheduleAppointment.isPending,
		isCompleting: completeAppointment.isPending,
		isUpdatingStatus: updateStatusMutation.isPending,
	};
};
