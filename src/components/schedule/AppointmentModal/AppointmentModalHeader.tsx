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
    <CustomModalHeader onClose={onClose}>
      <CustomModalTitle>
        {currentMode === 'view' ? 'Detalhes do Agendamento' : currentMode === 'edit' ? 'Editar Agendamento' : 'Novo Agendamento'}
      </CustomModalTitle>
    </CustomModalHeader>
  );
};
