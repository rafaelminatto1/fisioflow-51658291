import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import {
  Clock,
  Calendar,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Send
} from 'lucide-react';
import { useWaitlistMatch, type WaitlistMatch } from '@/hooks/useWaitlistMatch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WaitlistNotificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | string;
  time: string;
  onSchedulePatient?: (patientId: string) => void;
}

export function WaitlistNotification({ 
  open, 
  onOpenChange, 
  date, 
  time,
  onSchedulePatient 
}: WaitlistNotificationProps) {
  const [sentNotifications, setSentNotifications] = useState<Set<string>>(new Set());
  const { findMatchingEntries } = useWaitlistMatch();

  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const matches = findMatchingEntries(targetDate, time);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      default: return 'Normal';
    }
  };

  const formatWhatsAppMessage = (patientName: string) => {
    const dateStr = format(targetDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    return encodeURIComponent(
      `Olá ${patientName}! 🎉\n\n` +
      `Boas notícias! Um horário ficou disponível na nossa agenda:\n\n` +
      `📅 ${dateStr}\n` +
      `⏰ ${time}\n\n` +
      `Você tinha demonstrado interesse neste horário. Gostaria de confirmar o agendamento?\n\n` +
      `Por favor, responda o mais rápido possível para garantir a vaga!\n\n` +
      `Aguardamos seu retorno. 😊`
    );
  };

  const handleSendWhatsApp = (match: WaitlistMatch) => {
    const phone = match.entry.patient?.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Paciente não possui telefone cadastrado');
      return;
    }

    const message = formatWhatsAppMessage(match.entry.patient?.name || 'Paciente');
    const whatsappUrl = `https://wa.me/55${phone}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Mark as notified
    setSentNotifications(prev => new Set([...prev, match.entry.id]));

    toast.success(`Mensagem enviada para ${match.entry.patient?.name}`);
  };

  const handleSchedulePatient = (match: WaitlistMatch) => {
    if (onSchedulePatient) {
      onSchedulePatient(match.entry.patient_id);
      onOpenChange(false);
    }
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Pacientes Interessados Neste Horário
          </DialogTitle>
          <DialogDescription>
            {matches.length} paciente{matches.length !== 1 ? 's' : ''} na lista de espera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Slot info */}
          <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium">Horário disponível</p>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {format(targetDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                <Clock className="h-3 w-3 ml-2" />
                {time}
              </p>
            </div>
          </div>

          {/* Matches list */}
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {matches.map((match, index) => (
                <div 
                  key={match.entry.id}
                  className={cn(
                    "p-4 rounded-lg border bg-card transition-all",
                    index === 0 && "ring-2 ring-primary/50 bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">
                            {match.entry.patient?.name}
                          </span>
                          <Badge variant="outline" className={cn("text-xs", getPriorityColor(match.entry.priority))}>
                            {getPriorityLabel(match.entry.priority)}
                          </Badge>
                          {index === 0 && (
                            <Badge className="bg-primary/80 text-xs">Melhor match</Badge>
                          )}
                        </div>
                        
                        {match.entry.patient?.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {match.entry.patient.phone}
                          </p>
                        )}

                        {match.entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {match.entry.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => handleSendWhatsApp(match)}
                        disabled={sentNotifications.has(match.entry.id)}
                      >
                        {sentNotifications.has(match.entry.id) ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Enviado
                          </>
                        ) : (
                          <>
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </>
                        )}
                      </Button>
                      {onSchedulePatient && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => handleSchedulePatient(match)}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Agendar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {matches.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs">
              <Send className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Os pacientes estão ordenados por prioridade e tempo de espera. 
                O botão WhatsApp abre uma mensagem pronta informando sobre a vaga disponível.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
