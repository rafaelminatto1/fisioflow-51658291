/**
 * NOTE: This service uses Cloudflare Workers for appointment notifications.
 * You need to implement Workers to:
 * 1. Schedule notifications for appointments
 * 2. Send notifications via FCM or other channels
 * 3. Handle reschedule and cancellation notifications
 *
 * The current implementation uses Inngest for scheduling.
 */

import { fisioLogger as logger } from "@/lib/errors/logger";
import { whatsappApi } from "@/lib/api/workers-client";

export class AppointmentNotificationService {
	/**
	 * Schedule notification for an appointment
	 * NOTE: Requires Cloudflare Worker implementation
	 */
	static async scheduleNotification(
		appointmentId: string,
		patientId: string,
		date: Date,
		time: string,
		patientName: string,
	) {
		try {
			if (!appointmentId || !patientId || !date || !time) {
				logger.error(
					"Dados incompletos para notificação",
					{ appointmentId, patientId, date, time },
					"AppointmentNotificationService",
				);
				return null;
			}

			logger.info(
				"Agendando notificação para consulta",
				{ appointmentId, date, time },
				"AppointmentNotificationService",
			);

			await whatsappApi.createMessage({
				appointment_id: appointmentId,
				patient_id: patientId,
				message_type: "appointment_scheduled",
				message_content: `Consulta agendada para ${date.toLocaleDateString("pt-BR")} às ${time} para ${patientName}.`,
				status: "pendente",
				metadata: {
					appointment_id: appointmentId,
					patient_name: patientName,
					notification_kind: "schedule",
					scheduled_for: date.toISOString(),
				},
			});

			logger.info(
				"Notificação agendada com sucesso (placeholder)",
				{ appointmentId },
				"AppointmentNotificationService",
			);
			return { success: true, appointmentId };
		} catch (error) {
			logger.error(
				"Falha ao agendar notificação",
				error,
				"AppointmentNotificationService",
			);
			// Don't fail the appointment if notification fails
			return null;
		}
	}

	/**
	 * Notify about reschedule
	 * NOTE: Requires Cloudflare Worker implementation
	 */
	static async notifyReschedule(
		appointmentId: string,
		patientId: string,
		newDate: Date,
		newTime: string,
		patientName: string,
	) {
		try {
			if (!appointmentId || !patientId || !newDate || !newTime) {
				logger.error(
					"Dados incompletos para notificação de reagendamento",
					{ appointmentId, patientId, newDate, newTime },
					"AppointmentNotificationService",
				);
				return null;
			}

			logger.info(
				"Notificando reagendamento",
				{ appointmentId, newDate, newTime },
				"AppointmentNotificationService",
			);

			await whatsappApi.createMessage({
				appointment_id: appointmentId,
				patient_id: patientId,
				message_type: "appointment_reschedule",
				message_content: `Consulta reagendada para ${newDate.toLocaleDateString("pt-BR")} às ${newTime} para ${patientName}.`,
				status: "pendente",
				metadata: {
					appointment_id: appointmentId,
					patient_name: patientName,
					notification_kind: "reschedule",
					scheduled_for: newDate.toISOString(),
				},
			});

			logger.info(
				"Notificação de reagendamento enviada",
				{ appointmentId },
				"AppointmentNotificationService",
			);
			return { success: true, appointmentId };
		} catch (error) {
			logger.error(
				"Falha ao notificar reagendamento",
				error,
				"AppointmentNotificationService",
			);
			return null;
		}
	}

	/**
	 * Notify about cancellation
	 * NOTE: Requires Cloudflare Worker implementation
	 */
	static async notifyCancellation(
		appointmentId: string,
		patientId: string,
		date: Date,
		time: string,
		patientName: string,
	) {
		try {
			if (!appointmentId || !patientId || !date || !time) {
				logger.error(
					"Dados incompletos para notificação de cancelamento",
					{ appointmentId, patientId, date, time },
					"AppointmentNotificationService",
				);
				return null;
			}

			logger.info(
				"Notificando cancelamento",
				{ appointmentId },
				"AppointmentNotificationService",
			);

			await whatsappApi.createMessage({
				appointment_id: appointmentId,
				patient_id: patientId,
				message_type: "appointment_cancellation",
				message_content: `Consulta de ${patientName} em ${date.toLocaleDateString("pt-BR")} às ${time} foi cancelada.`,
				status: "pendente",
				metadata: {
					appointment_id: appointmentId,
					patient_name: patientName,
					notification_kind: "cancellation",
					scheduled_for: date.toISOString(),
				},
			});

			logger.info(
				"Notificação de cancelamento enviada",
				{ appointmentId },
				"AppointmentNotificationService",
			);
			return { success: true, appointmentId };
		} catch (error) {
			logger.error(
				"Falha ao notificar cancelamento",
				error,
				"AppointmentNotificationService",
			);
			return null;
		}
	}
}
