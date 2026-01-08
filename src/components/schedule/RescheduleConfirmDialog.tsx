import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Clock, ArrowRight, User } from 'lucide-react';
import type { Appointment } from '@/types/appointment';

interface RescheduleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  newDate: Date | null;
  newTime: string | null;
  onConfirm: () => void;
  isPending?: boolean;
}

export const RescheduleConfirmDialog: React.FC<RescheduleConfirmDialogProps> = ({
  open,
  onOpenChange,
  appointment,
  newDate,
  newTime,
  onConfirm,
  isPending = false
}) => {
  if (!appointment || !newDate || !newTime) return null;

  const oldDate = typeof appointment.date === 'string'
    ? (() => {
      const [y, m, d] = appointment.date.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0); // Local noon
    })()
    : appointment.date;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Confirmar Reagendamento
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Deseja reagendar o atendimento de <strong className="text-foreground">{appointment.patientName}</strong>?
              </p>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {/* De */}
                <div className="flex-1 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">De</span>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(oldDate, "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {appointment.time}
                  </div>
                </div>

                {/* Seta */}
                <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />

                {/* Para */}
                <div className="flex-1 space-y-1">
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">Para</span>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Calendar className="h-4 w-4" />
                    {format(newDate, "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Clock className="h-4 w-4" />
                    {newTime}
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Reagendando...' : 'Confirmar Reagendamento'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
