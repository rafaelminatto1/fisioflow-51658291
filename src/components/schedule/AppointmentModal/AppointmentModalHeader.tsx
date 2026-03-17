import React from 'react';
import { CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';

interface AppointmentModalHeaderProps {
  currentMode: 'create' | 'edit' | 'view';
  onClose: () => void;
}

export const AppointmentModalHeader: React.FC<AppointmentModalHeaderProps> = ({
  currentMode,
  onClose,
}) => {
  return (
    <CustomModalHeader 
      onClose={onClose}
      className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-blue-50 dark:border-slate-800"
    >
      <CustomModalTitle className="font-serif text-2xl text-blue-950 dark:text-blue-50 tracking-tight">
        {currentMode === 'view' ? 'Detalhes do Agendamento' : currentMode === 'edit' ? 'Editar Agendamento' : 'Novo Agendamento'}
      </CustomModalTitle>
    </CustomModalHeader>
  );
};
