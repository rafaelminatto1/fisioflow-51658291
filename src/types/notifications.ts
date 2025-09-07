// Tipos de notificação
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Interface para notificação (global notifications, não confundir com Notification do index.ts)
export interface GlobalNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}