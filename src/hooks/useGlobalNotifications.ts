import { toast } from 'sonner';
import { Notification } from '@/components/error/GlobalNotifications';

// Hook para gerenciar notificações globais
export const useGlobalNotifications = () => {
  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    // Use sonner's built-in notification types
    switch (notification.type) {
      case 'success':
        toast.success(notification.title, {
          description: notification.message,
          duration: notification.persistent ? Infinity : (notification.duration || 5000),
        });
        break;
      case 'error':
        toast.error(notification.title, {
          description: notification.message,
          duration: notification.persistent ? Infinity : (notification.duration || 5000),
        });
        break;
      case 'warning':
        toast.warning(notification.title, {
          description: notification.message,
          duration: notification.persistent ? Infinity : (notification.duration || 5000),
        });
        break;
      case 'info':
        toast.info(notification.title, {
          description: notification.message,
          duration: notification.persistent ? Infinity : (notification.duration || 5000),
        });
        break;
      default:
        toast(notification.title, {
          description: notification.message,
          duration: notification.persistent ? Infinity : (notification.duration || 5000),
        });
    }
    
    return id;
  };
  
  const showSuccess = (
    title: string,
    message?: string,
    options?: Partial<Pick<Notification, 'duration' | 'action'>>
  ) => {
    return showNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  };
  
  const showError = (
    title: string,
    message?: string,
    options?: Partial<Pick<Notification, 'duration' | 'persistent' | 'action'>>
  ) => {
    return showNotification({
      type: 'error',
      title,
      message,
      persistent: true, // Erros são persistentes por padrão
      ...options
    });
  };
  
  const showWarning = (
    title: string,
    message?: string,
    options?: Partial<Pick<Notification, 'duration' | 'action'>>
  ) => {
    return showNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  };
  
  const showInfo = (
    title: string,
    message?: string,
    options?: Partial<Pick<Notification, 'duration' | 'action'>>
  ) => {
    return showNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  };
  
  const dismissAll = () => {
    toast.dismiss();
  };
  
  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissAll
  };
};