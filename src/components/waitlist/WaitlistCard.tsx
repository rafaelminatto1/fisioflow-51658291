import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import {
  Clock,
  User,
  Calendar,
  Phone,
  Mail,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  Trash2,
  ArrowUp,
} from 'lucide-react';
import {
  type WaitlistEntry,
  formatPreferences,
  PRIORITY_CONFIG,
} from '@/hooks/useWaitlist';

interface WaitlistCardProps {
  entry: WaitlistEntry;
  onOfferSlot?: () => void;
  onRemove?: () => void;
  onUpdatePriority?: (priority: 'normal' | 'high' | 'urgent') => void;
  onAcceptOffer?: () => void;
  onRejectOffer?: () => void;
}

export function WaitlistCard({
  entry,
  onOfferSlot,
  onRemove,
  onUpdatePriority,
  onAcceptOffer,
  onRejectOffer,
}: WaitlistCardProps) {
  const priorityConfig = PRIORITY_CONFIG[entry.priority];
  const isOffered = entry.status === 'offered';
  const isExpiringSoon = isOffered && entry.offer_expires_at && 
    new Date(entry.offer_expires_at).getTime() - Date.now() < 4 * 60 * 60 * 1000; // 4 horas

  return (
    <Card className={`
      transition-all
      ${entry.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}
      ${entry.priority === 'high' ? 'border-l-4 border-l-yellow-500' : ''}
      ${isOffered ? 'bg-blue-500/5 border-blue-500/30' : ''}
    `}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Info do paciente */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{entry.patient?.name || 'Paciente'}</span>
              <Badge variant={priorityConfig.color as any}>
                {priorityConfig.label}
              </Badge>
              {entry.refusal_count > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  {entry.refusal_count} recusa{entry.refusal_count > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Contato */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {entry.patient?.phone && (
                <a 
                  href={`tel:${entry.patient.phone}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Phone className="w-3 h-3" />
                  {entry.patient.phone}
                </a>
              )}
              {entry.patient?.email && (
                <a 
                  href={`mailto:${entry.patient.email}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="w-3 h-3" />
                  {entry.patient.email}
                </a>
              )}
            </div>

            {/* Preferências */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatPreferences(entry)}</span>
            </div>

            {/* Tempo na lista */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Na lista há {formatDistanceToNow(new Date(entry.created_at), { locale: ptBR })}</span>
            </div>

            {/* Notas */}
            {entry.notes && (
              <p className="text-sm text-muted-foreground italic">
                "{entry.notes}"
              </p>
            )}

            {/* Status de oferta */}
            {isOffered && entry.offered_slot && (
              <div className={`
                p-3 rounded-lg space-y-2
                ${isExpiringSoon ? 'bg-yellow-500/10' : 'bg-blue-500/10'}
              `}>
                <div className="flex items-center gap-2 text-sm">
                  <Send className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Vaga oferecida</span>
                </div>
                <p className="text-sm">
                  {format(new Date(entry.offered_slot), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
                {entry.offer_expires_at && (
                  <p className={`text-xs ${isExpiringSoon ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {isExpiringSoon && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    Expira {formatDistanceToNow(new Date(entry.offer_expires_at), { 
                      locale: ptBR, 
                      addSuffix: true 
                    })}
                  </p>
                )}
                
                {/* Ações da oferta */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={onAcceptOffer} className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Aceitar
                  </Button>
                  <Button size="sm" variant="outline" onClick={onRejectOffer} className="flex-1">
                    <XCircle className="w-4 h-4 mr-1" />
                    Recusar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {entry.status === 'waiting' && (
                <>
                  <DropdownMenuItem onClick={onOfferSlot}>
                    <Send className="w-4 h-4 mr-2" />
                    Oferecer vaga
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onUpdatePriority?.('urgent')}
                    disabled={entry.priority === 'urgent'}
                  >
                    <ArrowUp className="w-4 h-4 mr-2 text-red-500" />
                    Marcar como Urgente
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdatePriority?.('high')}
                    disabled={entry.priority === 'high'}
                  >
                    <ArrowUp className="w-4 h-4 mr-2 text-yellow-500" />
                    Marcar como Alta
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdatePriority?.('normal')}
                    disabled={entry.priority === 'normal'}
                  >
                    Marcar como Normal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem 
                onClick={onRemove}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover da lista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

