import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from './GlobalNotifications';

// Configurações de ícones e estilos por tipo
const notificationConfig = {
  success: {
    icon: CheckCircle,
    className: 'text-green-600 bg-green-50 border-green-200',
    iconClassName: 'text-green-600'
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-600 bg-red-50 border-red-200',
    iconClassName: 'text-red-600'
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    iconClassName: 'text-yellow-600'
  },
  info: {
    icon: Info,
    className: 'text-blue-600 bg-blue-50 border-blue-200',
    iconClassName: 'text-blue-600'
  }
};

// Componente de notificação customizada
interface CustomNotificationProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const CustomNotification: React.FC<CustomNotificationProps> = ({ notification, onDismiss }) => {
  const config = notificationConfig[notification.type];
  const Icon = config.icon;

  useEffect(() => {
    if (!notification.persistent && notification.duration !== 0) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, notification.persistent, onDismiss]);

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border shadow-sm max-w-md',
      config.className
    )}>
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconClassName)} />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">
          {notification.title}
        </div>
        
        {notification.message && (
          <div className="text-sm opacity-90 mt-1">
            {notification.message}
          </div>
        )}
        
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="text-sm font-medium underline mt-2 hover:no-underline"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onDismiss(notification.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default CustomNotification;