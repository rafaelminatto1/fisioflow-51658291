/**
 * Accessibility Utilities
 * Helper functions for improving app accessibility
 */


/**
 * Check if screen reader is enabled
 */

import { AccessibilityInfo, Platform } from 'react-native';

export async function isScreenReaderEnabled(): Promise<boolean> {
  return await AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Check if reduce motion is enabled
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return await AccessibilityInfo.isReduceMotionEnabled();
  }
  return false; // Android doesn't have this setting
}

/**
 * Check if bold text is enabled (iOS)
 */
export async function isBoldTextEnabled(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return await AccessibilityInfo.isBoldTextEnabled();
  }
  return false; // Android doesn't have this setting
}

/**
 * Announce a message to screen readers
 */
export function announceForAccessibility(message: string): void {
  if (Platform.OS === 'android') {
    // Android: Use AccessibilityInfo.announceForAccessibility
    AccessibilityInfo.announceForAccessibility(message);
  } else {
    // iOS: Use UIAccessibilityPostNotification
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * Get accessibility label for numeric values (e.g., "3 of 10")
 */
export function getAccessibilityLabelForProgress(
  current: number,
  total: number,
  itemLabel?: string
): string {
  const base = itemLabel ? `${itemLabel} ` : '';
  return `${base}${current} de ${total}`;
}

/**
 * Get accessibility hint for a swipeable action
 */
export function getSwipeHint(action: string, direction: 'left' | 'right' | 'up' | 'down'): string {
  const directions = {
    left: 'deslize para a esquerda',
    right: 'deslize para a direita',
    up: 'deslize para cima',
    down: 'deslize para baixo',
  };
  return `${directions[direction]} para ${action}`;
}

/**
 * Get accessibility state for a checklist item
 */
export function getAccessibilityStateForChecklist(
  checked: boolean,
  total: number,
  checkedCount: number
) {
  return {
    checked,
    accessibilityLabel: checked ? 'Marcado' : 'Não marcado',
    accessibilityRole: 'checkbox' as const,
    accessibilityState: {
      checked,
    },
    accessibilityValue: {
      text: `${checkedCount} de ${total} marcados`,
    },
  };
}

/**
 * Common accessibility labels in Portuguese
 */
export const AccessibilityLabels = {
  // Navigation
  goBack: 'Voltar',
  close: 'Fechar',
  menu: 'Menu',
  settings: 'Configurações',
  profile: 'Perfil',

  // Actions
  confirm: 'Confirmar',
  cancel: 'Cancelar',
  delete: 'Excluir',
  edit: 'Editar',
  save: 'Salvar',
  refresh: 'Atualizar',

  // States
  loading: 'Carregando',
  error: 'Erro',
  success: 'Sucesso',
  empty: 'Vazio',

  // Exercise
  exercise: 'Exercício',
  exercises: 'Exercícios',
  completed: 'Concluído',
  notCompleted: 'Não concluído',
  video: 'Vídeo',

  // Progress
  progress: 'Progresso',
  streak: 'Sequência',
  sessions: 'Sessões',

  // Appointments
  appointment: 'Consulta',
  appointments: 'Consultas',
  upcoming: 'Próximas',
  past: 'Anteriores',
  today: 'Hoje',
  tomorrow: 'Amanhã',

  // Notifications
  notification: 'Notificação',
  notifications: 'Notificações',
  enableNotifications: 'Ativar notificações',
  notificationPermission: 'Permissão de notificação',
};

/**
 * Focus management helpers
 */
export const FocusManagement = {
  /**
   * Get accessibility hint for a form field
   */
  getFieldHint(label: string, required: boolean, type?: string): string {
    let hint = `${label}`;
    if (required) {
      hint += ', obrigatório';
    }
    if (type) {
      hint += `, ${type}`;
    }
    return hint;
  },

  /**
   * Get error announcement for form validation
   */
  getErrorAnnouncement(fieldName: string, error: string): string {
    return `Erro em ${fieldName}: ${error}`;
  },
};
