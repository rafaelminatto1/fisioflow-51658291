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
import { AlertTriangle, Clock, ListPlus, CalendarPlus } from 'lucide-react';

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
      <AlertDialogContent className="max-w-md border-red-300/70 bg-red-50/50">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-500/15">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg text-red-800">Capacidade Máxima Atingida</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-red-700">
                Este horário já ultrapassa a capacidade configurada para os profissionais disponíveis.
              </p>
              <div className="bg-white/80 rounded-lg p-3 space-y-2 border border-red-200/70">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium">{selectedTime} - {formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Capacidade:</span>
                  <span className="font-medium">{maxCapacity} paciente{maxCapacity > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Após este agendamento:</span>
                  <span className="font-semibold text-red-700">{currentCount} pacientes</span>
                </div>
                {exceededBy > 0 && (
                  <div className="text-xs text-red-700 font-medium">
                    Excedente de {exceededBy} paciente{exceededBy > 1 ? 's' : ''}.
                  </div>
                )}
              </div>
              <p className="text-sm font-medium">O que deseja fazer?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Button
          variant="destructive"
          className="justify-start h-12 px-4 bg-red-600 hover:bg-red-700"
          onClick={onScheduleAnyway}
        >
          <CalendarPlus className="h-4 w-4 mr-3" />
          <div className="text-left">
            <p className="font-medium text-sm">Agendar Mesmo Assim</p>
            <p className="text-xs text-red-100">Confirma atendimento acima da capacidade</p>
          </div>
        </Button>
        
        <div className="grid gap-2 py-2">
          <Button
            variant="outline"
            className="justify-start h-12 px-4 border-blue-500/20 hover:bg-blue-500/5 hover:border-blue-500/40"
            onClick={() => {
              onOpenChange(false);
              onChooseAnotherTime();
            }}
          >
            <Clock className="h-4 w-4 mr-3 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-sm">Escolher Outro Horário</p>
              <p className="text-xs text-muted-foreground">Selecionar um horário com vagas disponíveis</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-12 px-4 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
            onClick={() => {
              onOpenChange(false);
              onAddToWaitlist();
            }}
          >
            <ListPlus className="h-4 w-4 mr-3 text-primary" />
            <div className="text-left">
              <p className="font-medium text-sm">Entrar na Fila de Espera</p>
              <p className="text-xs text-muted-foreground">Paciente será notificado quando houver vaga</p>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
