import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignedDocumentBadgeProps {
  status: 'signed' | 'pending' | 'rejected' | 'expired';
  signedAt?: string;
  signerName?: string;
  className?: string;
}

export function SignedDocumentBadge({ 
  status, 
  signedAt, 
  signerName,
  className 
}: SignedDocumentBadgeProps) {
  const statusConfig = {
    signed: {
      icon: Check,
      label: 'Assinado',
      variant: 'default' as const,
      className: 'bg-green-500 hover:bg-green-600'
    },
    pending: {
      icon: Clock,
      label: 'Pendente',
      variant: 'secondary' as const,
      className: 'bg-yellow-500 hover:bg-yellow-600 text-yellow-foreground'
    },
    rejected: {
      icon: AlertCircle,
      label: 'Rejeitado',
      variant: 'destructive' as const,
      className: ''
    },
    expired: {
      icon: Clock,
      label: 'Expirado',
      variant: 'outline' as const,
      className: 'text-muted-foreground'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={cn('flex items-center gap-1', config.className, className)}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {status === 'signed' && (
              <>
                <p>Assinado por: {signerName}</p>
                <p>Em: {signedAt ? new Date(signedAt).toLocaleString('pt-BR') : '-'}</p>
              </>
            )}
            {status === 'pending' && <p>Aguardando assinatura</p>}
            {status === 'rejected' && <p>Assinatura rejeitada</p>}
            {status === 'expired' && <p>Documento expirado</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
