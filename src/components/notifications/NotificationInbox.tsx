import { useState, useEffect } from "react";
import { Bell, Check, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { notificationsApi, type Notification as NotificationRecord } from "@/api/v2";

interface Notification extends NotificationRecord {
  read_at?: string;
}

export function NotificationInbox() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen]);

  const loadNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await notificationsApi.list({ limit: 60 });
      const notificationList = (response?.data ?? []).map((notification) => ({
        ...notification,
        created_at: notification.created_at
          ? String(notification.created_at)
          : new Date().toISOString(),
      })) as Notification[];

      setNotifications(notificationList);
      setUnreadCount(notificationList.filter((n) => !n.is_read).length);
    } catch (error) {
      logger.error("Error loading notifications", error, "NotificationInbox");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markRead(notificationId);
      const now = new Date().toISOString();
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: now } : n,
        );
        setUnreadCount(updated.filter((n) => !n.is_read).length);
        return updated;
      });
    } catch (error) {
      logger.error("Error marking notification as read", error, "NotificationInbox");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      const now = new Date().toISOString();
      setNotifications((prev) => {
        const updated = prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: now,
        }));
        setUnreadCount(0);
        return updated;
      });
      toast.success("Todas as notificações marcadas como lidas");
    } catch (error) {
      logger.error("Error marking all as read", error, "NotificationInbox");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsApi.delete(notificationId);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notificationId);
        setUnreadCount(updated.filter((n) => !n.is_read).length);
        return updated;
      });
    } catch (error) {
      logger.error("Error deleting notification", error, "NotificationInbox");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment_reminder":
      case "appointment_change":
        return "📅";
      case "exercise_reminder":
      case "exercise_milestone":
        return "💪";
      case "progress_update":
        return "📊";
      case "therapist_message":
        return "💬";
      case "payment_reminder":
        return "💳";
      default:
        return "🔔";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-0 text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex gap-3 p-4 hover:bg-muted/50 transition-colors ${
                    !notification.is_read ? "bg-muted/30" : ""
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: pt,
                      })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!notification.is_read && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Marcar como lida
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
