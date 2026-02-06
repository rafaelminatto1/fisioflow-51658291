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
import { AlertTriangle, Calendar, Clock, Users } from 'lucide-react';
import type { Appointment } from '@/types/appointment';

interface RescheduleCapacityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  newDate: Date | null;
  newTime: string | null;
  currentCount: number;
  maxCapacity: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export const RescheduleCapacityDialog: React.FC<RescheduleCapacityDialogProps> = ({
  open,
  onOpenChange,
  appointment,
  newDate,
  newTime,
  currentCount,
  maxCapacity,
  onConfirm,
  onCancel,
  isPending = false,
}) => {
  if (!appointment || !newDate || !newTime) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-red-300/70 bg-red-50/60">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/15">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-red-800">
              Capacidade Máxima Atingida
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-red-700">
              <p>
                O novo horário de <strong>{appointment.patientName}</strong> já está no limite de capacidade.
              </p>
              <div className="rounded-lg border border-red-200/70 bg-white/85 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Data
                  </span>
                  <span className="font-medium">
                    {format(newDate, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Horário
                  </span>
                  <span className="font-medium">{newTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Ocupação após mover
                  </span>
                  <span className="font-semibold text-red-700">
                    {currentCount}/{maxCapacity}
                  </span>
                </div>
              </div>
              <p className="font-medium">
                Deseja manter o reagendamento mesmo assim?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            onClick={onCancel}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Manter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
