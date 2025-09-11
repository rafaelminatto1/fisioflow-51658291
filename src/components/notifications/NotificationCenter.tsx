import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos de notificação
type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Interface para notificação
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Mock data para demonstração
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'info',
    title: 'Nova consulta agendada',
    message: 'João Silva agendou uma consulta para amanhã às 14:00',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
    read: false,
    actionUrl: '/schedule'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Exercício em atraso',
    message: 'Maria Santos não realizou os exercícios de hoje',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    read: false,
    actionUrl: '/patients'
  },
  {
    id: '3',
    type: 'success',
    title: 'Pagamento recebido',
    message: 'Pagamento de R$ 150,00 foi confirmado',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    read: true,
    actionUrl: '/financial'
  },
  {
    id: '4',
    type: 'error',
    title: 'Falha na sincronização',
    message: 'Erro ao sincronizar dados com o servidor',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
    read: false
  }
];

// Componente para ícone da notificação
const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  const iconClass = "w-4 h-4";
  
  switch (type) {
    case 'success':
      return <CheckCircle className={cn(iconClass, "text-green-500")} />;
    case 'warning':
      return <AlertTriangle className={cn(iconClass, "text-yellow-500")} />;
    case 'error':
      return <AlertCircle className={cn(iconClass, "text-red-500")} />;
    default:
      return <Info className={cn(iconClass, "text-blue-500")} />;
  }
};

// Função para formatar tempo relativo
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d atrás`;
};

// Componente principal
export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);

  // Contar notificações não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  // Marcar notificação como lida
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Marcar todas como lidas
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Remover notificação
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Simular novas notificações (para demonstração)
  useEffect(() => {
    const interval = setInterval(() => {
      // Adicionar uma nova notificação aleatoriamente (muito raramente)
      if (Math.random() < 0.1) { // 10% de chance a cada 30 segundos
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: 'info',
          title: 'Nova atividade',
          message: 'Algo interessante aconteceu no sistema',
          timestamp: new Date(),
          read: false
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Manter apenas 10 notificações
      }
    }, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start p-3 cursor-pointer",
                  !notification.read && "bg-muted/50"
                )}
                onClick={() => {
                  markAsRead(notification.id);
                  if (notification.actionUrl) {
                    // Aqui você pode navegar para a URL da ação
                    // navigate(notification.actionUrl);
                  }
                }}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-2 flex-1">
                    <NotificationIcon type={notification.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full ml-2 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center">
              <span className="text-sm text-muted-foreground">Ver todas as notificações</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;