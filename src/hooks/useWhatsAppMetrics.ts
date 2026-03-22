import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WhatsAppService } from "@/lib/services/WhatsAppService";
import {
	whatsappApi,
	type WhatsAppMessage,
	type WhatsAppTemplateRecord,
	type WhatsAppWebhookLog,
} from "@/api/v2";

export type WhatsAppMetric = WhatsAppMessage & {
	phone_number?: string | null;
	template_key?: string | null;
	reply_content?: string | null;
	error_message?: string | null;
	retry_count?: number;
	patients?: { name?: string | null } | null;
};

export type WhatsAppTemplate = WhatsAppTemplateRecord;

export interface MetricsSummary {
	totalSent: number;
	delivered: number;
	read: number;
	failed: number;
	responseRate: number;
	avgResponseTime: number;
	deliveryRate: number;
	readRate: number;
}

type DailyStat = {
	date: string;
	sent: number;
	delivered: number;
	read: number;
	failed: number;
};

const toMinutes = (start?: string | null, end?: string | null) => {
	if (!start || !end) return null;
	const startMs = new Date(start).getTime();
	const endMs = new Date(end).getTime();
	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
	return (endMs - startMs) / (1000 * 60);
};

const normalizeStatus = (status?: string | null) => {
	const raw = String(status ?? "").toLowerCase();
	if (raw === "delivered" || raw === "entregue") return "entregue";
	if (raw === "read" || raw === "lido") return "lido";
	if (raw === "failed" || raw === "falhou") return "falhou";
	if (raw === "sent" || raw === "enviado") return "enviado";
	return raw || "pendente";
};

const mapMessage = (message: WhatsAppMessage): WhatsAppMetric => {
	const metadata = (message.metadata ?? {}) as Record<string, unknown>;
	return {
		...message,
		phone_number:
			(metadata.to_phone as string | undefined) ??
			(metadata.phone_number as string | undefined) ??
			null,
		template_key:
			(metadata.template_key as string | undefined) ??
			(metadata.message_type as string | undefined) ??
			message.message_type ??
			null,
		reply_content:
			(metadata.response_content as string | undefined) ??
			message.response_content ??
			null,
		error_message: (metadata.error_message as string | undefined) ?? null,
		retry_count: Number(metadata.retry_count ?? 0) || 0,
		patients:
			typeof metadata.patient_name === "string"
				? { name: metadata.patient_name }
				: null,
	};
};

const summarizeMetrics = (messages: WhatsAppMetric[]): MetricsSummary => {
	const outbound = messages.filter(
		(message) =>
			!message.metadata?.direction ||
			message.metadata?.direction === "outbound",
	);
	const totalSent = outbound.length;
	const delivered = outbound.filter(
		(message) =>
			message.delivered_at ||
			normalizeStatus(message.status) === "entregue" ||
			normalizeStatus(message.status) === "lido",
	).length;
	const read = outbound.filter(
		(message) => message.read_at || normalizeStatus(message.status) === "lido",
	).length;
	const failed = outbound.filter(
		(message) => normalizeStatus(message.status) === "falhou",
	).length;
	const replied = outbound.filter(
		(message) => message.response_received_at || message.reply_content,
	).length;
	const responseTimes = outbound
		.map((message) =>
			toMinutes(
				message.sent_at ?? message.created_at,
				message.response_received_at,
			),
		)
		.filter((value): value is number => value != null && value >= 0);
	const avgResponseTime =
		responseTimes.length > 0
			? Math.round(
					responseTimes.reduce((sum, value) => sum + value, 0) /
						responseTimes.length,
				)
			: 0;

	return {
		totalSent,
		delivered,
		read,
		failed,
		responseRate: totalSent > 0 ? Math.round((replied / totalSent) * 100) : 0,
		avgResponseTime,
		deliveryRate: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0,
		readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
	};
};

const buildDailyStats = (
	messages: WhatsAppMetric[],
	days: number,
): DailyStat[] => {
	const grouped = new Map<string, DailyStat>();
	for (let i = 0; i < days; i += 1) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		const key = date.toISOString().split("T")[0];
		grouped.set(key, { date: key, sent: 0, delivered: 0, read: 0, failed: 0 });
	}

	messages.forEach((message) => {
		const dateKey = (message.created_at ?? message.sent_at ?? "").slice(0, 10);
		const entry = grouped.get(dateKey);
		if (!entry) return;
		entry.sent += 1;
		if (
			message.delivered_at ||
			normalizeStatus(message.status) === "entregue" ||
			normalizeStatus(message.status) === "lido"
		) {
			entry.delivered += 1;
		}
		if (message.read_at || normalizeStatus(message.status) === "lido") {
			entry.read += 1;
		}
		if (normalizeStatus(message.status) === "falhou") {
			entry.failed += 1;
		}
	});

	return Array.from(grouped.values()).reverse();
};

export function useWhatsAppConnection() {
	return useQuery({
		queryKey: ["whatsapp", "connection"],
		queryFn: async () => {
			const [config, test] = await Promise.allSettled([
				whatsappApi.getConfig(),
				WhatsAppService.testConnection(),
			]);

			const base =
				config.status === "fulfilled"
					? {
							connected: Boolean(config.value?.data?.enabled),
							config: config.value?.data ?? {},
						}
					: { connected: false, config: {} };

			if (test.status === "fulfilled") {
				return {
					...base,
					connected: base.connected && test.value.connected,
					error: test.value.error,
				};
			}

			return {
				...base,
				error: test.reason instanceof Error ? test.reason.message : undefined,
			};
		},
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});
}

export function useWhatsAppMetricsSummary(days: number = 30) {
	return useQuery({
		queryKey: ["whatsapp", "metrics-summary", days],
		queryFn: async (): Promise<MetricsSummary> => {
			const res = await whatsappApi.listMessages({
				limit: Math.max(days * 50, 200),
			});
			const messages = (res?.data ?? []).map(mapMessage).filter((message) => {
				const createdAt = message.created_at ?? message.sent_at;
				if (!createdAt) return false;
				const age = Date.now() - new Date(createdAt).getTime();
				return age <= days * 24 * 60 * 60 * 1000;
			});
			return summarizeMetrics(messages);
		},
		staleTime: 2 * 60 * 1000,
	});
}

export function useWhatsAppMessages(limitCount: number = 50) {
	return useQuery({
		queryKey: ["whatsapp", "messages", limitCount],
		queryFn: async () => {
			const res = await whatsappApi.listMessages({ limit: limitCount });
			return (res?.data ?? []).map(mapMessage);
		},
		staleTime: 60 * 1000,
	});
}

export function useWhatsAppTemplates() {
	return useQuery({
		queryKey: ["whatsapp", "templates"],
		queryFn: async () => {
			const res = await whatsappApi.listTemplates();
			return res?.data ?? [];
		},
		staleTime: 10 * 60 * 1000,
	});
}

export function useWhatsAppWebhookLogs(limitCount: number = 100) {
	return useQuery({
		queryKey: ["whatsapp", "webhook-logs", limitCount],
		queryFn: async (): Promise<WhatsAppWebhookLog[]> => {
			const res = await whatsappApi.listWebhookLogs({ limit: limitCount });
			return res?.data ?? [];
		},
		staleTime: 30 * 1000,
	});
}

export function useSendTestMessage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			phone,
			message,
		}: {
			phone: string;
			message: string;
		}) => {
			const result = await WhatsAppService.sendMessage({ to: phone, message });
			if (!result.success) {
				throw new Error(result.error ?? "Falha ao enviar mensagem");
			}
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp", "messages"] });
			queryClient.invalidateQueries({
				queryKey: ["whatsapp", "metrics-summary"],
			});
			queryClient.invalidateQueries({ queryKey: ["whatsapp", "daily-stats"] });
			toast.success("Mensagem de teste enviada!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao enviar: " + error.message);
		},
	});
}

export function useUpdateTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, content }: { id: string; content: string }) => {
			const res = await whatsappApi.updateTemplate(id, { content });
			return res?.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
			toast.success("Template atualizado!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar: " + error.message);
		},
	});
}

export function useWhatsAppDailyStats(days: number = 7) {
	return useQuery({
		queryKey: ["whatsapp", "daily-stats", days],
		queryFn: async () => {
			const res = await whatsappApi.listMessages({
				limit: Math.max(days * 50, 200),
			});
			const messages = (res?.data ?? []).map(mapMessage).filter((message) => {
				const createdAt = message.created_at ?? message.sent_at;
				if (!createdAt) return false;
				const age = Date.now() - new Date(createdAt).getTime();
				return age <= days * 24 * 60 * 60 * 1000;
			});
			return buildDailyStats(messages, days);
		},
		staleTime: 5 * 60 * 1000,
	});
}
