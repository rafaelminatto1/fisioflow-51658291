import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';

interface ConfirmationStatusBadgeProps {
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  size?: 'sm' | 'md';
}

export function ConfirmationStatusBadge({ status, size = 'md' }: ConfirmationStatusBadgeProps) {
  const config = {
    pending: {
      icon: Clock,
      label: 'Aguardando',
      variant: 'secondary' as const,
    },
    confirmed: {
      icon: CheckCircle2,
      label: 'Confirmado',
      variant: 'default' as const,
    },
    cancelled: {
      icon: XCircle,
      label: 'Cancelado',
      variant: 'destructive' as const,
    },
    rescheduled: {
      icon: RefreshCw,
      label: 'Reagendado',
      variant: 'outline' as const,
    },
  };

  const { icon: Icon, label, variant } = config[status];
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={iconSize} />
      {label}
    </Badge>
  );
}
