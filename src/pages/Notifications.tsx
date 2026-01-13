import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  DollarSign,
  MessageCircle,
  Users,
  Loader2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const typeIcons: Record<Notification['type'], React.ReactNode> = {
  info: <Info className="h-5 w-5 text-blue-500" />,
  success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  appointment: <Calendar className="h-5 w-5 text-primary" />,
  payment: <DollarSign className="h-5 w-5 text-emerald-500" />,
  whatsapp: <MessageCircle className="h-5 w-5 text-green-600" />,
  waitlist: <Users className="h-5 w-5 text-purple-500" />,
};

const typeLabels: Record<Notification['type'], string> = {
  info: 'Informação',
  success: 'Sucesso',
  warning: 'Aviso',
  error: 'Erro',
  appointment: 'Agendamento',
  payment: 'Pagamento',
  whatsapp: 'WhatsApp',
  waitlist: 'Lista de Espera',
};

const typeColors: Record<Notification['type'], string> = {
  info: 'bg-blue-500/10 border-blue-500/20',
  success: 'bg-green-500/10 border-green-500/20',
  warning: 'bg-amber-500/10 border-amber-500/20',
  error: 'bg-red-500/10 border-red-500/20',
  appointment: 'bg-primary/10 border-primary/20',
  payment: 'bg-emerald-500/10 border-emerald-500/20',
  whatsapp: 'bg-green-600/10 border-green-600/20',
  waitlist: 'bg-purple-500/10 border-purple-500/20',
};

const NotificationCard: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}> = ({ notification, onMarkAsRead }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const fullDate = format(new Date(notification.created_at), "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        notification.is_read ? 'opacity-60' : typeColors[notification.type]
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="mt-1 shrink-0">
            {typeIcons[notification.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn(
                  "font-semibold",
                  !notification.is_read && "text-foreground"
                )}>
                  {notification.title}
                </p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {typeLabels[notification.type]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!notification.is_read && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Marcar como lida
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {notification.message}
            </p>
            {notification.link && (
              <Link to={notification.link}>
                <Button variant="link" className="h-auto p-0 mt-2 text-primary">
                  Ver detalhes →
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>{timeAgo}</span>
              <span>•</span>
              <span>{fullDate}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Notifications: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications(100);

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-sm">
              <Bell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} notificação${unreadCount !== 1 ? 'ões' : ''} não lida${unreadCount !== 1 ? 's' : ''}`
                  : 'Todas as notificações lidas'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllAsRead}
            >
              {isMarkingAllAsRead ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all" className="gap-2">
              Todas
              <Badge variant="secondary" className="ml-1">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2">
              Não lidas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Lidas</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="all" className="mt-6">
                {notifications.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unread" className="mt-6">
                {unreadNotifications.length === 0 ? (
                  <EmptyState message="Nenhuma notificação não lida" />
                ) : (
                  <div className="space-y-3">
                    {unreadNotifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="read" className="mt-6">
                {readNotifications.length === 0 ? (
                  <EmptyState message="Nenhuma notificação lida" />
                ) : (
                  <div className="space-y-3">
                    {readNotifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};

const EmptyState: React.FC<{ message?: string }> = ({
  message = 'Nenhuma notificação',
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
      <Bell className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold">{message}</h3>
    <p className="text-sm text-muted-foreground mt-1">
      Você está em dia com tudo!
    </p>
  </div>
);

export default Notifications;
