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
      <AlertDialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-br from-red-50 to-white p-6 pb-2">
          <AlertDialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-red-100 text-red-600 shadow-sm border border-red-200/50">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-red-900 tracking-tight">
                  Capacidade Atingida
                </AlertDialogTitle>
                <p className="text-sm text-red-600/80 font-medium">Limite de pacientes excedido</p>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        <div className="px-6 py-4 space-y-6">
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                A agenda para o novo horário de <span className="font-semibold text-foreground underline decoration-red-200 underline-offset-4">{appointment.patientName}</span> já atingiu o limite de capacidade configurado.
              </p>

              <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm group transition-all hover:bg-slate-50 hover:border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Data
                    </span>
                    <p className="text-sm font-semibold text-slate-700">
                      {format(newDate, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" /> Horário
                    </span>
                    <p className="text-sm font-semibold text-slate-700">{newTime}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Ocupação estimada
                    </span>
                    <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      {currentCount}/{maxCapacity}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-slate-400"
                      style={{ width: `${Math.min(100, (maxCapacity / currentCount) * 100)}%` }}
                    />
                    <div
                      className="h-full bg-red-500 animate-pulse"
                      style={{ width: `${Math.max(0, 100 - (maxCapacity / currentCount) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-600 text-center pt-2">
                Deseja confirmar o reagendamento mesmo assim?
              </p>
            </div>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="p-6 pt-2 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 gap-3 sm:space-x-0">
          <AlertDialogCancel
            disabled={isPending}
            onClick={onCancel}
            className="w-full mt-0 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-600 font-medium h-11 rounded-xl transition-all"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-red-200 border-none transition-all active:scale-[0.98]"
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
