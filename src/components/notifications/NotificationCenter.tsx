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
import { Bell, Check, X, AlertCircle, Info, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationManager } from '@/lib/services/NotificationManager';
import { NotificationHistory, NotificationType } from '@/types/notifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Legacy notification type for backward compatibility
type LegacyNotificationType = 'info' | 'success' | 'warning' | 'error';

// Convert NotificationType to legacy type for icon display
const getNotificationLegacyType = (type: NotificationType): LegacyNotificationType => {
  switch (type) {
    case NotificationType.EXERCISE_MILESTONE:
    case NotificationType.PROGRESS_UPDATE:
      return 'success';
    case NotificationType.SYSTEM_ALERT:
      return 'error';
    case NotificationType.EXERCISE_REMINDER:
      return 'warning';
    default:
      return 'info';
  }
};

// Componente para ícone da notificação
const NotificationIcon: React.FC<{ type: LegacyNotificationType }> = ({ type }) => {
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
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize notification manager and load notifications
  useEffect(() => {
    initializeNotifications();
    loadNotifications();
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      await notificationManager.initialize();
    } catch (error) {
      console.error('Failed to initialize notification manager:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const history = await notificationManager.getNotificationHistory(10, 0);
      setNotifications(history);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type === 'NOTIFICATION_CLICKED') {
      // Handle notification click from service worker
      const { url, data } = event.data;
      if (data?.notificationId) {
        notificationManager.markNotificationClicked(data.notificationId);
      }
      if (url) {
        navigate(url);
      }
      // Reload notifications to update status
      loadNotifications();
    }
  };

  // Count unread notifications (sent or delivered status)
  const unreadCount = notifications.filter(n => 
    n.status === 'sent' || n.status === 'delivered'
  ).length;

  // Mark notification as clicked
  const markAsClicked = async (id: string) => {
    try {
      await notificationManager.markNotificationClicked(id);
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, status: 'clicked', clickedAt: new Date() }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as clicked:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: NotificationHistory) => {
    markAsClicked(notification.id);
    
    // Navigate based on notification type
    let targetUrl = '/';
    switch (notification.type) {
      case NotificationType.APPOINTMENT_REMINDER:
      case NotificationType.APPOINTMENT_CHANGE:
        targetUrl = '/schedule';
        break;
      case NotificationType.EXERCISE_REMINDER:
      case NotificationType.EXERCISE_MILESTONE:
        targetUrl = '/exercises';
        break;
      case NotificationType.PROGRESS_UPDATE:
        targetUrl = '/patients';
        break;
      case NotificationType.THERAPIST_MESSAGE:
        targetUrl = '/communications';
        break;
      case NotificationType.PAYMENT_REMINDER:
        targetUrl = '/financial';
        break;
      default:
        targetUrl = '/';
    }
    
    navigate(targetUrl);
    setIsOpen(false);
  };



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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              navigate('/settings?tab=notifications');
              setIsOpen(false);
            }}
            className="h-auto p-1 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            Configurar
          </Button>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
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
                  (notification.status === 'sent' || notification.status === 'delivered') && "bg-muted/50"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-2 flex-1">
                    <NotificationIcon type={getNotificationLegacyType(notification.type)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          (notification.status === 'sent' || notification.status === 'delivered') && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {(notification.status === 'sent' || notification.status === 'delivered') && (
                          <div className="w-2 h-2 bg-primary rounded-full ml-2 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.sentAt, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center justify-center"
              onClick={() => {
                navigate('/settings?tab=notifications');
                setIsOpen(false);
              }}
            >
              <span className="text-sm text-muted-foreground">Ver histórico completo</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;