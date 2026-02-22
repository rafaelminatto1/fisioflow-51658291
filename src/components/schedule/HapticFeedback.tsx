/**
 * HapticFeedback - Utilitário para feedback háptico
 *
 * Fornece uma API unificada para feedback tátil em diferentes plataformas
 * - Web: navigator.vibrate (Chrome)
 * - iOS: Safari (não suporta, usa fallback)
 * - Android: navigator.vibrate
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

// Padrões de vibração para diferentes tipos de feedback
const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 20, 10],
  error: [30, 50],
  warning: [20, 30, 20]
};

// Verificar suporte a vibração
const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
};

/**
 * Dispara feedback háptico com padrão específico
 */
export const hapticFeedback = (pattern: HapticPattern): void => {
  if (!isHapticSupported()) return;

  const vibrationPattern = HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.light;

  try {
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
  }
};

/**
 * Feedback háptico para cliques leves
 */
export const hapticLight = (): void => {
  hapticFeedback('light');
};

/**
 * Feedback háptico para cliques médios
 */
export const hapticMedium = (): void => {
  hapticFeedback('medium');
};

/**
 * Feedback háptico para cliques pesados
 */
export const hapticHeavy = (): void => {
  hapticFeedback('heavy');
};

/**
 * Feedback háptico para sucesso
 */
export const hapticSuccess = (): void => {
  hapticFeedback('success');
};

/**
 * Feedback háptico para erro
 */
export const hapticError = (): void => {
  hapticFeedback('error');
};

/**
 * Feedback háptico para aviso
 */
export const hapticWarning = (): void => {
  hapticFeedback('warning');
};

/**
 * Feedback háptico customizado com array de durações
 * @param durations Array de durações em milissegundos (ex: [50, 100, 50])
 * @param iterations Número de repetições (default: 1)
 */
export const hapticCustom = (durations: number[], iterations = 1): void => {
  if (!isHapticSupported()) return;

  // Construir padrão repetido
  const pattern: number[] = [];
  for (let i = 0; i < iterations; i++) {
    pattern.push(...durations);
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.warn('Custom haptic feedback failed:', error);
  }
};

/**
 * Hook React para feedback háptico
 */
import { useCallback } from 'react';

export const useHaptic = () => {
  return {
    light: useCallback(() => hapticLight(), []),
    medium: useCallback(() => hapticMedium(), []),
    heavy: useCallback(() => hapticHeavy(), []),
    success: useCallback(() => hapticSuccess(), []),
    error: useCallback(() => hapticError(), []),
    warning: useCallback(() => hapticWarning(), []),
    custom: useCallback((durations: number[], iterations?: number) => hapticCustom(durations, iterations), []),
    isSupported: isHapticSupported()
  };
};
