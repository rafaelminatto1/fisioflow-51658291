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
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 sm:w-auto"
          >
            <X className="w-4 h-4 mr-1" />
            Excluir
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
        {currentMode === 'view' && hasAppointment && (
          <Button
            type="button"
            variant="default"
            onClick={onEdit}
            className="w-full sm:w-auto"
          >
            Editar
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {currentMode === 'view' ? 'Fechar' : 'Cancelar'}
        </Button>

        {currentMode !== 'view' && watchedStatus === 'avaliacao' && (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            className="w-full min-w-[100px] sm:w-auto"
            onClick={onScheduleOnly}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
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
              "w-full min-w-[100px] transition-all duration-200 sm:w-auto",
              watchedStatus === 'avaliacao' && "bg-violet-600 hover:bg-violet-700 text-white",
              isLoading && "opacity-80"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {currentMode === 'edit' ? 'Salvando...' : 'Criando...'}
              </span>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                {watchedStatus === 'avaliacao' ? 'Iniciar Avaliação' : (currentMode === 'edit' ? 'Salvar' : 'Criar')}
              </>
            )}
          </Button>
        )}
      </div>
    </CustomModalFooter>
  );
};
