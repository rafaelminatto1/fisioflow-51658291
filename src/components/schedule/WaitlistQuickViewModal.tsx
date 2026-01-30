import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
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
  Phone,
  Search,
  ExternalLink,
  Sun,
  Sunset,
  Moon,
  UserCircle2,
} from 'lucide-react';
import { useWaitlist, type WaitlistEntry } from '@/hooks/useWaitlist';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { PatientHelpers } from '@/types';

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
      const patientName = PatientHelpers.getName(entry.patient);
      onSchedulePatient(entry.patient_id, patientName);
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Carregando lista de espera...</span>
                </div>
              </motion.div>
            ) : filteredWaitlist.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl" />
                  <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 relative" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {searchQuery ? 'Nenhum paciente encontrado' : 'Lista de espera vazia'}
                </p>
                {searchQuery && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs text-muted-foreground mt-2"
                  >
                    Tente buscar por outro nome
                  </motion.p>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredWaitlist.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{
                        layout: { duration: 0.2 },
                        opacity: { duration: 0.15 },
                        y: { duration: 0.2 },
                      }}
                      whileHover={{ scale: 1.01, x: 2 }}
                      className="group relative p-4 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/20 hover:shadow-md transition-all cursor-default"
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Avatar with initials */}
                        <div className="flex-shrink-0 relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 border-2 border-primary/20 flex items-center justify-center text-sm font-bold text-primary shadow-sm">
                            {entry.patient?.name
                              ? entry.patient.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : <UserCircle2 className="w-5 h-5" />}
                          </div>
                          {/* Priority indicator */}
                          {entry.priority === 'urgent' && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-card"
                            />
                          )}
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
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          className="h-9 gap-2 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow"
                          onClick={() => handleSchedule(entry)}
                        >
                          <Calendar className="h-4 w-4" />
                          Agendar
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
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
