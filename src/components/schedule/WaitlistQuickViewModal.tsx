import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Clock,
  Calendar,
  User,
  Phone,
  Search,
  Plus,
  ExternalLink,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';
import { useWaitlist, type WaitlistEntry } from '@/hooks/useWaitlist';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface WaitlistQuickViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedulePatient?: (patientId: string, patientName: string) => void;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

const TIME_SLOT_CONFIG: Record<string, { label: string; icon: typeof Sun }> = {
  morning: { label: 'Manhã', icon: Sun },
  afternoon: { label: 'Tarde', icon: Sunset },
  evening: { label: 'Noite', icon: Moon },
};

export function WaitlistQuickViewModal({
  open,
  onOpenChange,
  onSchedulePatient,
}: WaitlistQuickViewModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: waitlist = [], isLoading: loading } = useWaitlist();

  const filteredWaitlist = waitlist.filter((entry) => {
    if (!searchQuery) return true;
    return (
      entry.patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.patient?.phone?.includes(searchQuery)
    );
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30';
      default:
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      default:
        return 'Normal';
    }
  };

  const handleSchedule = (entry: WaitlistEntry) => {
    if (onSchedulePatient && entry.patient) {
      onSchedulePatient(entry.patient_id, entry.patient.name);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Lista de Espera
            <Badge variant="secondary" className="ml-2">
              {waitlist.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Pacientes aguardando vagas disponíveis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* List */}
          <ScrollArea className="h-[400px] pr-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredWaitlist.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Nenhum paciente encontrado' : 'Lista de espera vazia'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWaitlist.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Name & Priority */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {entry.patient?.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-1.5 py-0', getPriorityColor(entry.priority))}
                            >
                              {getPriorityLabel(entry.priority)}
                            </Badge>
                          </div>

                          {/* Contact & Time in waitlist */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {entry.patient?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {entry.patient.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(entry.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>

                          {/* Preferred Days */}
                          {entry.preferred_days && entry.preferred_days.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <div className="flex gap-1">
                                {entry.preferred_days.map((day) => (
                                  <Badge
                                    key={day}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 h-5"
                                  >
                                    {DAY_LABELS[day] || day}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Preferred Time Slots */}
                          {entry.preferred_periods && entry.preferred_periods.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <div className="flex gap-1">
                                {entry.preferred_periods.map((slot) => {
                                  const config = TIME_SLOT_CONFIG[slot];
                                  const Icon = config?.icon || Clock;
                                  return (
                                    <Badge
                                      key={slot}
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-5 gap-1"
                                    >
                                      <Icon className="h-2.5 w-2.5" />
                                      {config?.label || slot}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {entry.notes && (
                            <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Schedule Button */}
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 flex-shrink-0"
                        onClick={() => handleSchedule(entry)}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Agendar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Link to="/waitlist">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver página completa
              </Button>
            </Link>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
