/**
 * Serviço para gerenciar Push Notifications no iOS
 */

import { pushSubscriptionsApi } from "@/api/v2";
import { authClient } from "@/lib/auth/neon-token";
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
	addPushActionListener,
	addPushReceivedListener,
	addPushRegistrationErrorListener,
	addPushRegistrationListener,
	getNativePlatform,
	isNativePlatform,
	registerForPushNotifications,
	requestPushPermission,
	scheduleLocalNotification,
	type NativePushActionPerformed,
	type NativePushNotification,
	type NativePushToken,
} from "@/lib/platform/native";

export interface PushNotificationData {
	title: string;
	body: string;
	userId?: string;
	type: "appointment" | "message" | "alert" | "update";
	data?: Record<string, unknown>;
}

/**
 * Inicializa o sistema de push notifications
 * Deve ser chamado ao iniciar o app (apenas em nativo)
 */
export async function initPushNotifications(
	navigate?: (path: string) => void,
): Promise<void> {
	// Verificar se está em plataforma nativa
	if (!isNativePlatform()) {
		logger.info(
			"Push notifications não disponíveis na web",
			undefined,
			"push-notifications",
		);
		return;
	}

	try {
		// Solicitar permissão
		const permission = await requestPushPermission();

		if (permission === "granted") {
			await registerForPushNotifications();
			logger.info(
				"Push notifications registradas com sucesso",
				undefined,
				"push-notifications",
			);
		} else {
			logger.warn(
				"Permissão de notificação negada pelo usuário",
				undefined,
				"push-notifications",
			);
			return;
		}

		// Listener: Registro bem-sucedido
		await addPushRegistrationListener(async (token: NativePushToken) => {
			// Dado sensível removido: apenas primeiros 8 caracteres do token para debug (segurança)
			const maskedToken = token.value.substring(0, 8) + "...";
			logger.info(
				"Push token registrado",
				{ token: maskedToken },
				"push-notifications",
			);
			await savePushTokenToDatabase(token.value);
		});

		// Listener: Erro no registro
		await addPushRegistrationErrorListener((error: unknown) => {
			logger.error(
				"Erro no registro de push notification",
				error,
				"push-notifications",
			);
		});

		// Listener: Notificação recebida (app em foreground)
		await addPushReceivedListener(
			async (notification: NativePushNotification) => {
				logger.info(
					"Notificação recebida (app aberto)",
					{ notification },
					"push-notifications",
				);

				// Mostrar notificação local também
				await showLocalNotification({
					title:
						typeof notification.data?.title === "string"
							? notification.data.title
							: "FisioFlow",
					body:
						typeof notification.data?.body === "string"
							? notification.data.body
							: "",
					id: Date.now(),
				});
			},
		);

		// Listener: Notificação clicada (app aberto pela notificação)
		await addPushActionListener((notification: NativePushActionPerformed) => {
			logger.info(
				"Notificação clicada",
				{ notification },
				"push-notifications",
			);
			handleNotificationAction(notification, navigate);
		});
	} catch (error) {
		logger.error(
			"Erro ao inicializar push notifications",
			error,
			"push-notifications",
		);
	}
}

/**
 * Salva o token de push no backend Neon/Workers.
 */
async function savePushTokenToDatabase(token: string): Promise<void> {
	try {
		const { data } = await authClient.getSession();
		const currentUser = data?.user;

		if (currentUser) {
			await pushSubscriptionsApi.upsert({
				endpoint: token,
				userId: currentUser.id,
				deviceInfo: {
					platform: getNativePlatform(),
					updated_at: new Date().toISOString(),
					last_used: new Date().toISOString(),
					native: true,
				},
				active: true,
			});

			logger.info(
				"Token salvo em Neon/Workers",
				undefined,
				"push-notifications",
			);
		} else {
			logger.info(
				"Usuário não autenticado, token não salvo",
				undefined,
				"push-notifications",
			);
		}
	} catch (error) {
		logger.error("Erro ao salvar token", error, "push-notifications");
	}
}

/**
 * Mostra notificação local (quando app está aberto)
 */
async function showLocalNotification(notification: {
	title: string;
	body: string;
	id: number;
}): Promise<void> {
	await scheduleLocalNotification(notification);
}

/**
 * Manipula clique na notificação
 */
function handleNotificationAction(
	notification: NativePushActionPerformed,
	navigate?: (path: string) => void,
): void {
	const type = notification.notification.data?.type;
	const id = notification.notification.data?.id;

	if (!navigate) {
		logger.warn(
			"Navegação não disponível para ação de notificação",
			undefined,
			"push-notifications",
		);
		return;
	}

	switch (type) {
		case "appointment":
			logger.info(
				"Navegar para detalhes da consulta",
				{ id },
				"push-notifications",
			);
			if (id) navigate(`/agenda?appointmentId=${id}`);
			else navigate("/");
			break;
		case "message":
			logger.info("Navegar para chat", { id }, "push-notifications");
			navigate("/communications");
			break;
		case "alert":
			logger.info("Navegar para alerta", undefined, "push-notifications");
			navigate("/notifications");
			break;
		default:
			logger.info("Navegar para dashboard", undefined, "push-notifications");
			navigate("/");
	}
}

/**
 * Envia notificação local (para testes ou lembretes no app)
 */
export async function sendLocalNotification(options: {
	title: string;
	body: string;
	id?: number;
	schedule?: Date;
}): Promise<void> {
	try {
		await LocalNotifications.schedule({
			notifications: [
				{
					title: options.title,
					body: options.body,
					id: options.id || Date.now(),
					schedule: options.schedule
						? { at: options.schedule }
						: { at: new Date() },
					sound: "default",
					smallIcon: "ic_stat_icon_config_sample",
					iconColor: "#0EA5E9",
				},
			],
		});
	} catch (error) {
		logger.error(
			"Erro ao enviar notificação local",
			error,
			"push-notifications",
		);
	}
}

/**
 * Cancela todas as notificações
 */
export async function clearAllNotifications(): Promise<void> {
	try {
		// cancel() requires options with notifications array, but to clear all we might need to get pending first.
		// For now assuming we want to cancel all pending.
		const pending = await LocalNotifications.getPending();
		if (pending.notifications.length > 0) {
			await LocalNotifications.cancel({ notifications: pending.notifications });
		}
	} catch (error) {
		logger.error("Erro ao limpar notificações", error, "push-notifications");
	}
}

/**
 * Cancela notificações específicas por ID
 */
export async function cancelNotification(ids: number[]): Promise<void> {
	try {
		await LocalNotifications.cancel({
			notifications: ids.map((id) => ({ id })),
		});
	} catch (error) {
		logger.error("Erro ao cancelar notificações", error, "push-notifications");
	}
}

/**
 * Obtém lista de notificações agendadas
 */
export async function getScheduledNotifications(): Promise<
	LocalNotificationScheduleResult[]
> {
	try {
		const pending = await LocalNotifications.getPending();
		return pending.notifications || [];
	} catch (error) {
		logger.error(
			"Erro ao obter notificações agendadas",
			error,
			"push-notifications",
		);
		return [];
	}
}
