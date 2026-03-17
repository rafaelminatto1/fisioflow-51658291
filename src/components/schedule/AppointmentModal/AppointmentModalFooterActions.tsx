import React from 'react';
import { Check, X, Trash2, Play, FileText, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomModalFooter } from '@/components/ui/custom-modal';
import { cn } from '@/lib/utils';

interface AppointmentModalFooterActionsProps {
  currentMode: 'create' | 'edit' | 'view';
  isCreating: boolean;
  isUpdating: boolean;
  watchedStatus: string;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: () => void;
  onScheduleOnly: () => void;
  isMobile: boolean;
  hasAppointment: boolean;
}

export const AppointmentModalFooterActions: React.FC<AppointmentModalFooterActionsProps> = ({
  currentMode,
  isCreating,
  isUpdating,
  watchedStatus,
  onClose,
  onDelete,
  onEdit,
  onSave,
  onScheduleOnly,
  isMobile,
  hasAppointment
}) => {
  const isLoading = isCreating || isUpdating;

  return (
    <CustomModalFooter 
      isMobile={isMobile} 
      className="items-stretch flex-col-reverse gap-3 bg-background sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex justify-center sm:justify-start w-full sm:w-auto">
        {currentMode === 'edit' && hasAppointment && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 sm:w-auto font-medium"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isLoading}
          className="w-full sm:w-auto text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        >
          {currentMode === 'view' ? 'Fechar' : 'Cancelar'}
        </Button>

        {currentMode === 'view' && hasAppointment && (
          <Button
            type="button"
            variant="default"
            onClick={onEdit}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}

        {currentMode !== 'view' && watchedStatus === 'avaliacao' && (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            className="w-full min-w-[100px] sm:w-auto border-blue-100 text-blue-700 hover:bg-blue-50"
            onClick={onScheduleOnly}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Agendar
              </>
            )}
          </Button>
        )}

        {currentMode !== 'view' && (
          <Button
            type="submit"
            form="appointment-form"
            disabled={isLoading}
            onClick={onSave}
            className={cn(
              "w-full min-w-[120px] transition-all duration-200 sm:w-auto shadow-sm",
              watchedStatus === 'avaliacao' 
                ? "bg-violet-600 hover:bg-violet-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white",
              isLoading && "opacity-80"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {currentMode === 'edit' ? 'Salvando...' : 'Criando...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {watchedStatus === 'avaliacao' ? <Play className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {watchedStatus === 'avaliacao' ? 'Iniciar Avaliação' : (currentMode === 'edit' ? 'Salvar Alterações' : 'Criar Agendamento')}
              </span>
            )}
          </Button>
        )}
      </div>
    </CustomModalFooter>
  );
};
