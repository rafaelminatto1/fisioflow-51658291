import {
	whatsappApi,
	type WhatsAppMessage as WhatsAppLogRecord,
	type WhatsAppTemplateRecord,
} from "@/lib/api/workers-client";
import { fisioLogger as logger } from "@/lib/errors/logger";

export interface WhatsAppMessage {
	to: string;
	message: string;
	templateKey?: string;
	patientId?: string;
	appointmentId?: string;
	scheduledFor?: Date;
}

export interface AppointmentReminder {
	patientName: string;
	patientPhone: string;
	patientId?: string;
	appointmentId?: string;
	appointmentDate: Date;
	appointmentTime: string;
	therapistName: string;
	location: string;
}

export interface WhatsAppTemplate {
	name: string;
	template_key: string;
	content: string;
	variables: string[];
}

export interface SendResult {
	success: boolean;
	messageId?: string | null;
	error?: string;
}

export interface SlotOfferData {
	patientName: string;
	patientPhone: string;
	patientId?: string;
	waitlistEntryId: string;
	slotDate: Date;
	slotTime: string;
	therapistName?: string;
	expiresInHours?: number;
}

export const TEMPLATE_KEYS = {
	CONFIRMACAO_AGENDAMENTO: "confirmacao_agendamento",
	LEMBRETE_SESSAO: "lembrete_sessao",
	CANCELAMENTO: "cancelamento",
	PRESCRICAO: "prescricao",
	RESULTADO_EXAME: "resultado_exame",
	SOLICITAR_CONFIRMACAO: "solicitar_confirmacao",
	OFERTA_VAGA: "oferta_vaga",
} as const;

function mapTemplate(template: WhatsAppTemplateRecord): WhatsAppTemplate {
	return {
		name: template.name,
		template_key: template.template_key,
		content: template.content,
		variables: template.variables ?? [],
	};
}

export class WhatsAppService {
	static async testConnection(): Promise<{
		connected: boolean;
		error?: string;
	}> {
		try {
			const config = await whatsappApi.getConfig();
			const enabled = Boolean(
				config.data?.enabled ?? config.data?.active ?? true,
			);
			return { connected: enabled };
		} catch (error) {
			return {
				connected: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	static async sendMessage(params: WhatsAppMessage): Promise<SendResult> {
		try {
			const result = await whatsappApi.createMessage({
				appointment_id: params.appointmentId,
				patient_id: params.patientId,
				message_type: params.templateKey ?? "custom",
				message_content: params.message,
				to_phone: params.to,
				status: "enviado",
				metadata: {
					template_key: params.templateKey ?? null,
					scheduled_for: params.scheduledFor?.toISOString() ?? null,
					to_phone: params.to,
				},
			});

			logger.info(
				"Mensagem WhatsApp registrada no Workers",
				{ to: params.to, templateKey: params.templateKey },
				"WhatsAppService",
			);
			return { success: true, messageId: result.data?.id ?? null };
		} catch (error) {
			const lastError =
				error instanceof Error ? error.message : "Unknown error";
			logger.error(
				"Falha ao registrar mensagem WhatsApp",
				error,
				"WhatsAppService",
			);
			return { success: false, messageId: null, error: lastError };
		}
	}

	static async getTemplates(): Promise<WhatsAppTemplate[]> {
		try {
			const result = await whatsappApi.listTemplates();
			return (result.data ?? []).map(mapTemplate);
		} catch (error) {
			logger.error(
				"Erro ao buscar templates WhatsApp",
				error,
				"WhatsAppService",
			);
			return [];
		}
	}

	static async sendFromTemplate(
		templateKey: string,
		variables: Record<string, string>,
		to: string,
		patientId?: string,
		appointmentId?: string,
	): Promise<SendResult> {
		const templates = await this.getTemplates();
		const template = templates.find(
			(item) => item.template_key === templateKey,
		);

		if (!template) {
			const message = Object.entries(variables)
				.map(([k, v]) => `${k}: ${v}`)
				.join(", ");

			return this.sendMessage({
				to,
				message,
				templateKey,
				patientId,
				appointmentId,
			});
		}

		let message = template.content;
		for (const [key, value] of Object.entries(variables)) {
			message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
		}

		return this.sendMessage({
			to,
			message,
			templateKey,
			patientId,
			appointmentId,
		});
	}

	static async sendAppointmentConfirmation(
		reminder: AppointmentReminder,
	): Promise<SendResult> {
		const date = reminder.appointmentDate.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});

		return this.sendFromTemplate(
			TEMPLATE_KEYS.CONFIRMACAO_AGENDAMENTO,
			{
				name: reminder.patientName,
				therapist: reminder.therapistName,
				date,
				time: reminder.appointmentTime,
			},
			reminder.patientPhone,
			reminder.patientId,
			reminder.appointmentId,
		);
	}

	static async sendSessionReminder(
		reminder: AppointmentReminder,
	): Promise<SendResult> {
		return this.sendFromTemplate(
			TEMPLATE_KEYS.LEMBRETE_SESSAO,
			{
				time: reminder.appointmentTime,
				therapist: reminder.therapistName,
			},
			reminder.patientPhone,
			reminder.patientId,
			reminder.appointmentId,
		);
	}

	static async sendCancellationNotification(
		patientPhone: string,
		appointmentDate: Date,
		patientId?: string,
		appointmentId?: string,
	): Promise<SendResult> {
		const date = appointmentDate.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});

		return this.sendFromTemplate(
			TEMPLATE_KEYS.CANCELAMENTO,
			{ date },
			patientPhone,
			patientId,
			appointmentId,
		);
	}

	static async sendConfirmationRequest(
		reminder: AppointmentReminder,
	): Promise<SendResult> {
		const date = reminder.appointmentDate.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
		});

		return this.sendFromTemplate(
			TEMPLATE_KEYS.SOLICITAR_CONFIRMACAO,
			{
				name: reminder.patientName,
				date,
				time: reminder.appointmentTime,
			},
			reminder.patientPhone,
			reminder.patientId,
			reminder.appointmentId,
		);
	}

	static async sendPrescriptionNotification(
		patientPhone: string,
		prescriptionLink: string,
		patientId?: string,
	): Promise<SendResult> {
		return this.sendFromTemplate(
			TEMPLATE_KEYS.PRESCRICAO,
			{ link: prescriptionLink },
			patientPhone,
			patientId,
		);
	}

	static async sendExerciseReminder(
		patientName: string,
		patientPhone: string,
		exercises: string[],
		patientId?: string,
	): Promise<SendResult> {
		const exerciseList = exercises.map((ex, i) => `${i + 1}. ${ex}`).join("\n");
		const message = `🏋️ *Lembrete de Exercícios - Activity Fisioterapia*\n\nOlá *${patientName}*!\n\nNão se esqueça de realizar seus exercícios hoje:\n\n${exerciseList}\n\n💪 Manter a constância é fundamental para sua recuperação!\n\nDúvidas? Entre em contato conosco! 💙`;
		return this.sendMessage({ to: patientPhone, message, patientId });
	}

	static async sendAppointmentReminder(
		reminder: AppointmentReminder,
	): Promise<boolean> {
		const result = await this.sendSessionReminder(reminder);
		return result.success;
	}

	static async sendSlotOffer(data: SlotOfferData): Promise<SendResult> {
		const dateFormatted = data.slotDate.toLocaleDateString("pt-BR", {
			weekday: "long",
			day: "2-digit",
			month: "2-digit",
		});

		return this.sendFromTemplate(
			TEMPLATE_KEYS.OFERTA_VAGA,
			{
				name: data.patientName,
				date: dateFormatted,
				time: data.slotTime,
				therapist: data.therapistName || "nossa equipe",
				expires: String(data.expiresInHours ?? 24),
			},
			data.patientPhone,
			data.patientId,
			data.waitlistEntryId,
		);
	}

	static async sendWelcomeMessage(
		patientName: string,
		patientPhone: string,
		patientId?: string,
	): Promise<SendResult> {
		const message = `👋 *Bem-vindo à Activity Fisioterapia!*\n\nOlá *${patientName}*!\n\nÉ um prazer tê-lo(a) conosco!\n\nNossa equipe está pronta para auxiliá-lo(a) em sua jornada de recuperação e bem-estar.\n\n📱 Você receberá lembretes automáticos de consultas e exercícios por este número.\n\n💬 Em caso de dúvidas, estamos à disposição!\n\nBem-vindo! 💙`;
		return this.sendMessage({ to: patientPhone, message, patientId });
	}

	static async getMetrics(days: number = 30): Promise<{
		totalSent: number;
		delivered: number;
		read: number;
		failed: number;
		responseRate: number;
		avgResponseTime: number;
	}> {
		try {
			const result = await whatsappApi.listMessages({ limit: 1000 });
			const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
			const metrics = (result.data ?? []).filter(
				(message: WhatsAppLogRecord) => {
					const createdAt = message.created_at
						? new Date(message.created_at).getTime()
						: 0;
					return createdAt >= cutoff;
				},
			);

			const totalSent = metrics.length;
			const delivered = metrics.filter(
				(m) => m.status === "entregue" || m.status === "enviado",
			).length;
			const read = metrics.filter((m) => m.status === "lido").length;
			const failed = metrics.filter((m) => m.status === "falhou").length;
			const responseRate = totalSent > 0 ? (read / totalSent) * 100 : 0;

			return {
				totalSent,
				delivered,
				read,
				failed,
				responseRate,
				avgResponseTime: 0,
			};
		} catch (error) {
			logger.error(
				"Erro ao buscar métricas WhatsApp",
				error,
				"WhatsAppService",
			);
			return {
				totalSent: 0,
				delivered: 0,
				read: 0,
				failed: 0,
				responseRate: 0,
				avgResponseTime: 0,
			};
		}
	}
}
