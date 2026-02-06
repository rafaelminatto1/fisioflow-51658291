import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle2, X } from 'lucide-react';

  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onUpdateStatusSelected: (status: string) => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onUpdateStatusSelected,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none motion-reduce:transition-none">
      <div className="flex items-center gap-2 mr-2">
        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          selecionados
        </span>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => onUpdateStatusSelected('confirmado')}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Confirmar
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir agendamentos?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. {selectedCount} agendamentos serão excluídos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={onDeleteSelected}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 ml-2" />

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={onClearSelection}
        aria-label="Sair do modo seleção"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
