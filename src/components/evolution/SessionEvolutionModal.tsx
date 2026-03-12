import React from 'react';
import {
  CustomModal,
  CustomModalBody,
} from '@/components/ui/custom-modal';
import { SessionEvolutionContainer } from './SessionEvolutionContainer';
import { useIsMobile } from '@/hooks/use-mobile';

interface SessionEvolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
}

export const SessionEvolutionModal: React.FC<SessionEvolutionModalProps> = ({
  open,
  onOpenChange,
  appointmentId,
  patientId
}) => {
  const isMobile = useIsMobile();

  return (
    <CustomModal 
      open={open} 
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      contentClassName="max-w-[100vw] w-full h-[100dvh] p-0 m-0 rounded-none border-none shadow-none"
    >
      <CustomModalBody className="p-0 sm:p-0 h-full overflow-hidden">
        <SessionEvolutionContainer
          appointmentId={appointmentId}
          patientId={patientId}
          onClose={() => onOpenChange(false)}
          mode="modal"
        />
      </CustomModalBody>
    </CustomModal>
  );
};

export default SessionEvolutionModal;
