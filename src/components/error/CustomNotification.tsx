import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomNotificationProps {
  message: string;
  title?: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  onClose?: () => void;
  className?: string;
}

const iconMap = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const styleMap = {
  error: 'border-destructive/50 bg-destructive/10 text-destructive [&>svg]:text-destructive',
  warning: 'border-warning/50 bg-warning/10 text-warning-foreground [&>svg]:text-warning',
  info: 'border-primary/50 bg-primary/10 text-foreground [&>svg]:text-primary',
  success: 'border-success/50 bg-success/10 text-foreground [&>svg]:text-success',
};

export const CustomNotification: React.FC<CustomNotificationProps> = ({
  message,
  title,
  type = 'info',
  onClose,
  className,
}) => {
  const Icon = iconMap[type];

  return (
    <Alert 
      className={cn(
        'relative animate-fade-in',
        styleMap[type],
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {title && <AlertTitle className="font-semibold">{title}</AlertTitle>}
      <AlertDescription className="text-sm">{message}</AlertDescription>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted/50 transition-colors"
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </Alert>
  );
};