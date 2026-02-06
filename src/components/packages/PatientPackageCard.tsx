import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Ticket
} from 'lucide-react';
import type { PatientPackage } from '@/hooks/usePackages';

interface PatientPackageCardProps {
  patientPackage: PatientPackage;
  onUseSession?: () => void;
  isUsing?: boolean;
}

export function PatientPackageCard({
  patientPackage,
  onUseSession,
  isUsing,
}: PatientPackageCardProps) {
  const {
    package: pkg,
    sessions_purchased,
    sessions_used,
    sessions_remaining = sessions_purchased - sessions_used,
    purchased_at,
    expires_at,
    status,
    is_expired,
  } = patientPackage;

  const daysUntilExpiration = expires_at 
    ? differenceInDays(new Date(expires_at), new Date())
    : null;

  const usagePercentage = sessions_purchased > 0 
    ? (sessions_used / sessions_purchased) * 100 
    : 0;

  const isNearExpiration = daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0;

  return (
    <Card className={`
      transition-all
      ${status === 'expired' ? 'opacity-60 border-muted' : ''}
      ${status === 'depleted' ? 'opacity-80 border-muted' : ''}
      ${isNearExpiration ? 'border-yellow-500/50' : ''}
    `}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">{pkg?.name || 'Pacote'}</CardTitle>
          </div>
          <StatusBadge status={status} isNearExpiration={isNearExpiration} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progresso de uso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sessões utilizadas</span>
            <span className="font-medium">{sessions_used} / {sessions_purchased}</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Restam {sessions_remaining} sessões</span>
            <span>{Math.round(usagePercentage)}% usado</span>
          </div>
        </div>

        {/* Informações de data */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Comprado em</p>
              <p>{format(new Date(purchased_at), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isNearExpiration ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-muted-foreground text-xs">Expira em</p>
              <p className={isNearExpiration ? 'text-yellow-600 font-medium' : ''}>
                {expires_at ? format(new Date(expires_at), "dd/MM/yyyy", { locale: ptBR }) : 'Sem expiração'}
              </p>
            </div>
          </div>
        </div>

        {/* Alerta de expiração próxima */}
        {isNearExpiration && (
          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg text-yellow-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Expira em {daysUntilExpiration} dia{daysUntilExpiration !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Botão de usar sessão */}
        {status === 'active' && onUseSession && (
          <Button 
            onClick={onUseSession} 
            className="w-full" 
            disabled={isUsing}
            variant={sessions_remaining <= 2 ? 'secondary' : 'default'}
          >
            {isUsing ? 'Processando...' : 'Usar 1 Sessão'}
          </Button>
        )}

        {/* Mensagem de pacote expirado */}
        {is_expired && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg text-destructive text-sm">
            <XCircle className="w-4 h-4" />
            <span>Este pacote expirou</span>
          </div>
        )}

        {/* Mensagem de pacote esgotado */}
        {status === 'depleted' && !is_expired && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-muted-foreground text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Todas as sessões foram utilizadas</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ 
  status, 
  isNearExpiration 
}: { 
  status?: string; 
  isNearExpiration?: boolean;
}) {
  if (status === 'expired') {
    return <Badge variant="destructive">Expirado</Badge>;
  }
  if (status === 'depleted') {
    return <Badge variant="secondary">Esgotado</Badge>;
  }
  if (isNearExpiration) {
    return <Badge className="bg-yellow-500">Expirando</Badge>;
  }
  return <Badge className="bg-green-500">Ativo</Badge>;
}

