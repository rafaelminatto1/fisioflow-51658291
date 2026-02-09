import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Verifica se o dispositivo suporta haptics
 */
export function isHapticsSupported(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Impacto leve (toque suave)
 * Use para: Feedback de toques leves, scroll em listas
 */
export async function hapticLight(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.error('Haptic light error:', error);
  }
}

/**
 * Impacto médio (toque padrão)
 * Use para: Confirmar ações, feedback de seleção
 */
export async function hapticMedium(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.error('Haptic medium error:', error);
  }
}

/**
 * Impacto forte (toque intenso)
 * Use para: Confirmações importantes, alertas
 */
export async function hapticHeavy(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.error('Haptic heavy error:', error);
  }
}

/**
 * Notificação de sucesso
 * Use para: Operações concluídas com sucesso
 */
export async function hapticSuccess(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.error('Haptic success error:', error);
  }
}

/**
 * Notificação de aviso
 * Use para: Alertas, atenção necessária
 */
export async function hapticWarning(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.error('Haptic warning error:', error);
  }
}

/**
 * Notificação de erro
 * Use para: Erros, falhas operacionais
 */
export async function hapticError(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.error('Haptic error error:', error);
  }
}

/**
 * Seleção (efeito de rolagem/scroll)
 * Use para: Scroll em listas, seleção de opções
 */
export async function hapticSelection(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.error('Haptic selection error:', error);
  }
}

/**
 * Objeto com todas as funções haptic
 */
export const haptic = {
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
  success: hapticSuccess,
  warning: hapticWarning,
  error: hapticError,
  selection: hapticSelection,
};
