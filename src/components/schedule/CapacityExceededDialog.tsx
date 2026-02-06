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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-lg">Capacidade Excedida</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Você está tentando agendar mais pacientes do que a capacidade configurada para este horário.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium">{selectedTime} - {formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Capacidade:</span>
                  <span className="font-medium text-amber-600">{currentCount}/{maxCapacity} pacientes</span>
                </div>
              </div>
              <p className="text-sm font-medium">O que deseja fazer?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid gap-2 py-2">
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
              <p className="font-medium text-sm">Adicionar à Lista de Espera</p>
              <p className="text-xs text-muted-foreground">Paciente será notificado quando houver vaga</p>
            </div>
          </Button>
          
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
            className="justify-start h-12 px-4 border-amber-500/20 hover:bg-amber-500/5 hover:border-amber-500/40"
            onClick={() => {
              onOpenChange(false);
              onScheduleAnyway();
            }}
          >
            <CalendarPlus className="h-4 w-4 mr-3 text-amber-600" />
            <div className="text-left">
              <p className="font-medium text-sm">Agendar Assim Mesmo</p>
              <p className="text-xs text-muted-foreground">Paciente será marcado como excedente</p>
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
