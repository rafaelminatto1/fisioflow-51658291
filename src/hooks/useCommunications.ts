/**
 * useCommunications - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
	communicationsApi,
	type CommunicationLogRecord,
} from "@/api/v2";

export type CommunicationType = "email" | "whatsapp" | "sms" | "push";
export type CommunicationStatus =
	| "pendente"
	| "enviado"
	| "entregue"
	| "lido"
	| "falha";

export interface PatientBasicInfo {
	id: string;
	full_name?: string | null;
	name?: string | null;
	email?: string | null;
	phone?: string | null;
}

export interface Communication extends CommunicationLogRecord {
	patient?: PatientBasicInfo | null;
}

export function useCommunications(filters?: {
	channel?: string;
	status?: string;
}) {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;

	return useQuery({
		queryKey: ["communications", organizationId, filters],
		queryFn: async () => {
			if (!organizationId) return [];
			const res = await communicationsApi.list({
				channel: filters?.channel,
				status: filters?.status,
				limit: 100,
			});
			return (res.data ?? []) as Communication[];
		},
		enabled: !!organizationId,
	});
}

export function useCommunicationStats() {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;

	return useQuery({
		queryKey: ["communication-stats", organizationId],
		queryFn: async () => {
			if (!organizationId) return null;
			const res = await communicationsApi.stats();
			return res.data;
		},
		enabled: !!organizationId,
	});
}

interface SendCommunicationData {
	type: CommunicationType;
	patient_id: string;
	recipient: string;
	subject?: string;
	body: string;
}

export function useSendCommunication() {
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: SendCommunicationData) => {
			if (!organizationId) throw new Error("Organização não encontrada");
			const res = await communicationsApi.create({
				...data,
				status: "pendente",
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["communications", organizationId],
			});
			queryClient.invalidateQueries({
				queryKey: ["communication-stats", organizationId],
			});
			toast.success("Comunicação enviada com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao enviar comunicação: " + error.message);
		},
	});
}

export function useDeleteCommunication() {
	const queryClient = useQueryClient();
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;

	return useMutation({
		mutationFn: async (id: string) => {
			await communicationsApi.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["communications", organizationId],
			});
			queryClient.invalidateQueries({
				queryKey: ["communication-stats", organizationId],
			});
			toast.success("Comunicação excluída");
		},
		onError: (error: Error) => {
			toast.error("Erro ao excluir: " + error.message);
		},
	});
}

export function useResendCommunication() {
	const queryClient = useQueryClient();
	const { currentOrganization } = useOrganizations();
	const organizationId = currentOrganization?.id;

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await communicationsApi.resend(id);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["communications", organizationId],
			});
			toast.success("Comunicação reenviada");
		},
		onError: (error: Error) => {
			toast.error("Erro ao reenviar: " + error.message);
		},
	});
}

export function getStatusLabel(status: CommunicationStatus): string {
	const labels: Record<CommunicationStatus, string> = {
		pendente: "Pendente",
		enviado: "Enviado",
		entregue: "Entregue",
		lido: "Lido",
		falha: "Falha",
	};
	return labels[status] || status;
}

export function getTypeLabel(type: CommunicationType): string {
	const labels: Record<CommunicationType, string> = {
		email: "Email",
		whatsapp: "WhatsApp",
		sms: "SMS",
		push: "Push",
	};
	return labels[type] || type;
}
