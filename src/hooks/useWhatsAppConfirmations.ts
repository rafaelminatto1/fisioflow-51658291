/**
 * useWhatsAppConfirmations - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	appointmentsApi,
	whatsappApi,
	type WhatsAppMessage,
	type PendingConfirmation,
} from "@/lib/api/workers-client";

export type WhatsAppMessageType =
	| "reminder_24h"
	| "reminder_2h"
	| "confirmation"
	| "cancellation"
	| "rescheduling";

export const useWhatsAppConfirmations = (appointmentId?: string) => {
	const queryClient = useQueryClient();

	const { data: messages = [], isLoading } = useQuery<WhatsAppMessage[]>({
		queryKey: ["whatsapp-messages", appointmentId],
		queryFn: async () => {
			const res = await whatsappApi.listMessages({
				appointmentId,
				limit: 200,
			});
			return res.data ?? [];
		},
	});

	const { data: pendingConfirmations = [], isLoading: loadingPending } =
		useQuery<PendingConfirmation[]>({
			queryKey: ["pending-confirmations"],
			queryFn: async () => {
				const res = await whatsappApi.pendingConfirmations({ limit: 200 });
				return res.data ?? [];
			},
		});

	const sendReminder = useMutation({
		mutationFn: async ({
			appointmentId,
			patientId,
			messageType,
			messageContent,
		}: {
			appointmentId: string;
			patientId: string;
			messageType: WhatsAppMessageType;
			messageContent: string;
		}) => {
			await whatsappApi.createMessage({
				appointment_id: appointmentId,
				patient_id: patientId,
				message_type: messageType,
				message_content: messageContent,
				metadata: {
					message_type: messageType,
				},
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
			queryClient.invalidateQueries({ queryKey: ["pending-confirmations"] });
			toast.success("Lembrete enviado via WhatsApp");
		},
		onError: (error: Error) => {
			toast.error("Erro ao enviar lembrete: " + error.message);
		},
	});

	const confirmAppointment = useMutation({
		mutationFn: async ({
			appointmentId,
			method = "manual",
		}: {
			appointmentId: string;
			method?: "whatsapp" | "phone" | "email" | "manual";
		}) => {
			await appointmentsApi.update(appointmentId, {
				status: "confirmed",
				confirmed_at: new Date().toISOString(),
				confirmed_via: method,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["appointments"] });
			queryClient.invalidateQueries({ queryKey: ["pending-confirmations"] });
			toast.success("Sessão confirmada");
		},
		onError: (error: Error) => {
			toast.error("Erro ao confirmar sessão: " + error.message);
		},
	});

	return {
		messages,
		pendingConfirmations,
		loading: isLoading || loadingPending,
		sendReminder: sendReminder.mutate,
		confirmAppointment: confirmAppointment.mutate,
		isSending: sendReminder.isPending,
		isConfirming: confirmAppointment.isPending,
	};
};
