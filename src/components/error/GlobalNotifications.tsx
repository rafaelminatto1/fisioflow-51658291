import React from 'react';
import { Alert, AlertDescription } from '@/components/shared/ui/alert';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface GlobalNotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function GlobalNotifications({ notifications, onDismiss }: GlobalNotificationsProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <Alert key={notification.id} className="w-96 shadow-lg">
          <div className="flex items-start gap-2">
            {getIcon(notification.type)}
            <div className="flex-1">
              <h4 className="font-semibold">{notification.title}</h4>
              <AlertDescription>{notification.message}</AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => onDismiss(notification.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}