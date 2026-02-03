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
import { cn } from '@/lib/utils';
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
    const dateStr = String(date);
    if (!dateStr || dateStr === 'Invalid Date') return new Date();
    // Handle ISO format (e.g. "2026-02-04T10:00:00.000Z") - use only YYYY-MM-DD part
    const dateOnly = dateStr.indexOf('T') >= 0 ? dateStr.slice(0, 10) : dateStr;
    if (dateOnly.length < 10) return new Date();
    const [y, m, d] = dateOnly.split('-').map(Number);
    const parsed = new Date(y, m - 1, d, 12, 0, 0);
    return Number.isFinite(parsed.getTime()) ? parsed : new Date();
  };

  const oldDate = parseDate(appointment.date);

  const safeFormat = (d: Date, fmt: string): string => {
    if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
    return format(d, fmt, { locale: ptBR });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg p-0 gap-0">
        <AlertDialogHeader className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">Confirmar Reagendamento</AlertDialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {appointment.patientName}
              </p>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="px-6 py-5">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Card DE - Horário atual */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">De</div>
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">
                    {safeFormat(oldDate, "dd 'de' MMMM")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {safeFormat(oldDate, "yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{appointment.time}</span>
                </div>
              </div>
            </div>

            {/* Seta */}
            <div className="flex items-center justify-center">
              <div className="p-2 bg-primary/10 rounded-full">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* Card PARA - Novo horário */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Para</div>
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-primary">
                    {safeFormat(newDate, "dd 'de' MMMM")}
                  </span>
                  <span className="text-primary/70 text-xs">
                    {safeFormat(newDate, "yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-primary">{newTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="px-6 py-4 border-t bg-muted/30 gap-3">
          <AlertDialogCancel
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Reagendando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Confirmar Reagendamento
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
