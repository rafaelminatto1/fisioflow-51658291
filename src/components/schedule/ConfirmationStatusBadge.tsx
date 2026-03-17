import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';

interface ConfirmationStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function ConfirmationStatusBadge({ status, size = 'md' }: ConfirmationStatusBadgeProps) {
  const s = String(status || 'agendado').toLowerCase();
  const config: Record<string, { icon: any, label: string, variant: any }> = {
    agendado: {
      icon: Clock,
      label: 'Agendado',
      variant: 'secondary' as const,
    },
    presenca_confirmada: {
      icon: CheckCircle2,
      label: 'Confirmado',
      variant: 'default' as const,
    },
    confirmado: {
      icon: CheckCircle2,
      label: 'Confirmado',
      variant: 'default' as const,
    },
    confirmed: {
      icon: CheckCircle2,
      label: 'Confirmado',
      variant: 'default' as const,
    },
    cancelado: {
      icon: XCircle,
      label: 'Cancelado',
      variant: 'destructive' as const,
    },
    cancelled: {
      icon: XCircle,
      label: 'Cancelado',
      variant: 'destructive' as const,
    },
    remarcar: {
      icon: RefreshCw,
      label: 'Remarcar',
      variant: 'outline' as const,
    },
    remarcado: {
      icon: RefreshCw,
      label: 'Remarcar',
      variant: 'outline' as const,
    },
    rescheduled: {
      icon: RefreshCw,
      label: 'Remarcar',
      variant: 'outline' as const,
    },
  };

  const currentConfig = config[s] || config.agendado;
  const { icon: Icon, label, variant } = currentConfig;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={iconSize} />
      {label}
    </Badge>
  );
}
