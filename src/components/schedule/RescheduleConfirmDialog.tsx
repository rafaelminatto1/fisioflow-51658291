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
} from '@/components/web/ui/alert-dialog';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
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

  const parseDate = (date: Date | string): Date => {
    if (date instanceof Date) return date;
    // Handle string dates in YYYY-MM-DD format - safety check for empty string
    const dateStr = String(date);
    if (!dateStr || dateStr === 'Invalid Date') return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  const oldDate = parseDate(appointment.date);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Confirmar Reagendamento
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-6 pt-4">
              <p className="text-base text-muted-foreground">
                Deseja reagendar o atendimento de <strong className="text-foreground">{appointment.patientName}</strong>?
              </p>

              <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg sm:flex-row sm:items-start sm:gap-6">
                {/* De */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-base font-medium text-foreground">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="font-bold text-muted-foreground uppercase">De</span>
                    <span>{format(oldDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base text-muted-foreground pl-7">
                    <Clock className="h-5 w-5" />
                    {appointment.time}
                  </div>
                </div>

                {/* Seta */}
                <div className="flex items-center justify-center pt-2 sm:pt-0">
                  <ArrowRight className="h-6 w-6 text-primary rotate-90 sm:rotate-0" />
                </div>

                {/* Para */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-base font-medium text-primary">
                    <Calendar className="h-5 w-5" />
                    <span className="font-bold uppercase">Para</span>
                    <span>{format(newDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base text-primary pl-7">
                    <Clock className="h-5 w-5" />
                    {newTime}
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Reagendando...' : 'Confirmar Reagendamento'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
