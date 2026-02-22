import React from 'react';
import {

  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, ListPlus, CalendarPlus, Users } from 'lucide-react';

interface CapacityExceededDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCount: number;
  maxCapacity: number;
  selectedTime: string;
  selectedDate: Date;
  onAddToWaitlist: () => void;
  onChooseAnotherTime: () => void;
  onScheduleAnyway: () => void;
}

export const CapacityExceededDialog: React.FC<CapacityExceededDialogProps> = ({
  open,
  onOpenChange,
  currentCount,
  maxCapacity,
  selectedTime,
  selectedDate,
  onAddToWaitlist,
  onChooseAnotherTime,
  onScheduleAnyway,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const exceededBy = Math.max(0, currentCount - maxCapacity);

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
                <p className="text-sm text-red-600/80 font-medium tracking-wide">Atenção: Limite ultrapassado</p>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        <div className="px-6 py-4 space-y-6">
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Este horário já ultrapassa a capacidade configurada para os profissionais disponíveis no momento.
              </p>

              <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm group transition-all hover:bg-slate-50 hover:border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Data e Horário
                    </span>
                    <p className="text-xs font-semibold text-slate-700">
                      {selectedTime} • {formatDate(selectedDate)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Ocupação estimada
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">Cap: {maxCapacity}</span>
                        <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          {currentCount} pacientes
                        </span>
                      </div>
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
                    {exceededBy > 0 && (
                      <p className="text-[10px] text-red-500 font-bold mt-2 text-right uppercase tracking-tighter">
                        Excedente de {exceededBy} paciente{exceededBy > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">O que deseja fazer?</p>

                <div className="grid gap-2">
                  <Button
                    variant="destructive"
                    className="w-full justify-start h-14 px-4 bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 group transition-all active:scale-[0.98]"
                    onClick={onScheduleAnyway}
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/20 mr-3 group-hover:bg-red-500/30 transition-colors">
                      <CalendarPlus className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Agendar Mesmo Assim</p>
                      <p className="text-[10px] text-red-100/80 font-medium">Confirmar atendimento extra</p>
                    </div>
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="justify-start h-14 px-4 border-slate-200 hover:bg-blue-50 hover:border-blue-200 group rounded-xl transition-all active:scale-[0.98]"
                      onClick={() => {
                        onOpenChange(false);
                        onChooseAnotherTime();
                      }}
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 text-blue-600 mr-2 group-hover:bg-blue-100 transition-colors">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[11px] leading-tight text-slate-700">Outro Horário</p>
                        <p className="text-[9px] text-slate-400 font-medium">Evitar lotação</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="justify-start h-14 px-4 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 group rounded-xl transition-all active:scale-[0.98]"
                      onClick={() => {
                        onOpenChange(false);
                        onAddToWaitlist();
                      }}
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 mr-2 group-hover:bg-emerald-100 transition-colors">
                        <ListPlus className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[11px] leading-tight text-slate-700">Fila de Espera</p>
                        <p className="text-[9px] text-slate-400 font-medium">Vagas futuras</p>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="p-4 pt-2 bg-slate-50/50 border-t border-slate-100 flex justify-center">
          <AlertDialogCancel className="border-none bg-transparent hover:bg-slate-200/50 text-slate-400 text-xs font-bold uppercase tracking-widest h-8 rounded-lg transition-all">
            Voltar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
