import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos de notificação
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Interface para notificação
export interface Notification {
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

// Hook para gerenciar notificações globais
export const useGlobalNotifications = () => {
  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const fullNotification = { ...notification, id };
    
    // Usar sonner para exibir a notificação customizada
    toast.custom(
      (t) => (
        <CustomNotification
          notification={fullNotification}
          onDismiss={() => toast.dismiss(t)}
        />
      ),
      {
        duration: notification.persistent ? Infinity : (notification.duration || 5000),
        position: 'top-right'
      }
    );
    
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

// Componente provider para notificações globais
interface GlobalNotificationsProviderProps {
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
}

export const GlobalNotificationsProvider: React.FC<GlobalNotificationsProviderProps> = ({
  children
}) => {
  return (
    <>
      {children}
      {/* O Sonner já está configurado no App.tsx, então não precisamos adicionar novamente */}
    </>
  );
};

// Hook para usar as notificações do sistema
export const useSystemNotifications = () => {
  const notifications = useGlobalNotifications();
  
  return {
    ...notifications,
    // Autenticação
    loginSuccess: (userName?: string) => {
      return notifications.showSuccess(
        'Login realizado com sucesso',
        userName ? `Bem-vindo, ${userName}!` : 'Bem-vindo de volta!'
      );
    },
    
    logoutSuccess: () => {
      return notifications.showSuccess('Logout realizado com sucesso', 'Até logo!');
    },
    
    sessionExpired: () => {
      return notifications.showWarning(
        'Sessão expirada',
        'Faça login novamente para continuar',
        {
          action: {
            label: 'Fazer Login',
            onClick: () => window.location.href = '/auth/login'
          }
        }
      );
    },
    
    // Operações CRUD
    createSuccess: (entity: string) => {
      return notifications.showSuccess(`${entity} criado com sucesso`);
    },
    
    updateSuccess: (entity: string) => {
      return notifications.showSuccess(`${entity} atualizado com sucesso`);
    },
    
    deleteSuccess: (entity: string) => {
      return notifications.showSuccess(`${entity} excluído com sucesso`);
    },
    
    // Erros comuns
    networkError: () => {
      return notifications.showError(
        'Erro de conexão',
        'Verifique sua conexão com a internet e tente novamente',
        {
          action: {
            label: 'Tentar Novamente',
            onClick: () => window.location.reload()
          }
        }
      );
    },
    
    serverError: () => {
      return notifications.showError(
        'Erro interno do servidor',
        'Tente novamente em alguns instantes',
        {
          action: {
            label: 'Recarregar',
            onClick: () => window.location.reload()
          }
        }
      );
    },
    
    validationError: (message: string) => {
      return notifications.showError('Erro de validação', message);
    },
    
    permissionDenied: () => {
      return notifications.showError(
        'Acesso negado',
        'Você não tem permissão para realizar esta ação'
      );
    },
    
    // Upload de arquivos
    uploadSuccess: (fileName: string) => {
      return notifications.showSuccess('Upload concluído', `Arquivo "${fileName}" enviado com sucesso`);
    },
    
    uploadError: (fileName: string, reason?: string) => {
      return notifications.showError(
        'Falha no upload',
        reason || `Não foi possível enviar o arquivo "${fileName}"`
      );
    },
    
    // Operações em lote
    batchOperationSuccess: (count: number, operation: string) => {
      return notifications.showSuccess(
        'Operação concluída',
        `${count} ${operation}${count > 1 ? 's' : ''} processado${count > 1 ? 's' : ''} com sucesso`
      );
    },
    
    batchOperationPartial: (success: number, failed: number, operation: string) => {
      return notifications.showWarning(
        'Operação parcialmente concluída',
        `${success} ${operation}${success > 1 ? 's' : ''} processado${success > 1 ? 's' : ''}, ${failed} falharam`
      );
    },
    
    // Sincronização
    syncSuccess: () => {
      return notifications.showSuccess('Sincronização concluída', 'Dados atualizados com sucesso');
    },
    
    syncError: () => {
      return notifications.showError(
        'Falha na sincronização',
        'Não foi possível sincronizar os dados',
        {
          action: {
            label: 'Tentar Novamente',
            onClick: () => {
              // Implementar lógica de retry
              console.log('Retry sync');
            }
          }
        }
      );
    },
    
    // Backup
    backupSuccess: () => {
      return notifications.showSuccess('Backup criado', 'Seus dados foram salvos com segurança');
    },
    
    backupRestored: () => {
      return notifications.showSuccess('Backup restaurado', 'Dados restaurados com sucesso');
    }
  };
};



export default GlobalNotificationsProvider;