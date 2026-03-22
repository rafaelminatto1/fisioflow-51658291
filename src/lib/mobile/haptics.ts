/**
 * Serviço para feedback tátil (vibrações hápticas)
 * Funciona apenas em dispositivos nativos (iOS/Android)
 */

/**
 * Verifica se haptics está disponível
 */

import { fisioLogger as logger } from "@/lib/errors/logger";
import {
	isNativePlatform,
	triggerHapticImpact,
	triggerHapticNotification,
	triggerHapticSelection,
	triggerHapticVibration,
} from "@/lib/platform/native";

export function isHapticsAvailable(): boolean {
	return isNativePlatform();
}

/**
 * Impacto leve (toque suave)
 * Use para: feedback sutil de toque
 */
export async function hapticLight(): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticImpact("light");
	} catch (error) {
		logger.error("Erro no haptic light", error, "haptics");
	}
}

/**
 * Impacto médio (toque padrão)
 * Use para: confirmação de ações comuns
 */
export async function hapticMedium(): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticImpact("medium");
	} catch (error) {
		logger.error("Erro no haptic medium", error, "haptics");
	}
}

/**
 * Impacto forte (toque intenso)
 * Use para: confirmações importantes, avisos
 */
export async function hapticHeavy(): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticImpact("heavy");
	} catch (error) {
		logger.error("Erro no haptic heavy", error, "haptics");
	}
}

/**
 * Notificação de sucesso
 * Use para: operações completadas com sucesso
 */
export async function hapticSuccess(): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticNotification("success");
	} catch (error) {
		logger.error("Erro no haptic success", error, "haptics");
	}
}

/**
 * Notificação de aviso
 * Use para: alertas, avisos moderados
 */
export async function hapticWarning(): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticNotification("warning");
	} catch (error) {
		logger.error("Erro no haptic warning", error, "haptics");
	}
}

/**
 * Notificação de erro
 * Use para: falhas, erros de validação
 */
export async function hapticError(): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticNotification("error");
	} catch (error) {
		logger.error("Erro no haptic error", error, "haptics");
	}
}

/**
 * Efeito de seleção (efeito de rolagem/scroll)
 * Use para: scroll em listas, seleção de opções
 */
export async function hapticSelection(): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticSelection();
	} catch (error) {
		logger.error("Erro no haptic selection", error, "haptics");
	}
}

/**
 * Vibrar por duração customizada (ms)
 * Use para: feedback tátil customizado
 */
export async function hapticVibrate(duration: number): Promise<void> {
	if (!isHapticsAvailable()) return;

	try {
		await triggerHapticVibration(duration);
	} catch (error) {
		logger.error("Erro no haptic vibrate", error, "haptics");
	}
}

/**
 * Hook para usar haptics em componentes
 */
export const hapticFeedback = {
	light: hapticLight,
	medium: hapticMedium,
	heavy: hapticHeavy,
	success: hapticSuccess,
	warning: hapticWarning,
	error: hapticError,
	selection: hapticSelection,
	vibrate: hapticVibrate,
};
