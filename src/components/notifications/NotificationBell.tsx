import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
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
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const typeIcons: Record<Notification['type'], React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  appointment: <Calendar className="h-4 w-4 text-primary" />,
  payment: <DollarSign className="h-4 w-4 text-emerald-500" />,
  whatsapp: <MessageCircle className="h-4 w-4 text-green-600" />,
  waitlist: <Users className="h-4 w-4 text-purple-500" />,
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

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClose,
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      onClose();
    }
  };

  const content = (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all hover:bg-muted/50 cursor-pointer',
        notification.is_read
          ? 'bg-transparent opacity-60'
          : typeColors[notification.type]
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {typeIcons[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              "text-sm font-medium truncate",
              !notification.is_read && "text-foreground"
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
        </div>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return content;
};

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications(10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative hover:bg-accent/80 transition-colors",
            className
          )}
        >
          <Bell className={cn(
            "h-5 w-5 transition-transform",
            unreadCount > 0 && "animate-[wiggle_0.5s_ease-in-out]"
          )} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-[10px] font-bold animate-in zoom-in-50"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 sm:w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="font-semibold">Notificações</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllAsRead}
            >
              {isMarkingAllAsRead ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
              )}
              Marcar todas
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está em dia com tudo!
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Link to="/notifications" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full h-9 text-sm">
                  Ver todas as notificações
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
